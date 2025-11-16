#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::sync::{atomic::{AtomicBool, Ordering}};
use tauri::State;
use bytemuck;

#[cfg(target_os = "windows")]
use wasapi::{get_default_device, Direction, WaveFormat, SampleType, initialize_mta, StreamMode};

#[cfg(target_os = "windows")]
use futures::{SinkExt};

#[cfg(target_os = "windows")]
use tokio_tungstenite::tungstenite::Message;

// 采集运行状态（避免重复启动）
struct CaptureState { running: AtomicBool }

// 启动系统音频采集（WASAPI 回环）
#[tauri::command]
async fn start_system_capture(state: State<'_, CaptureState>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if state.running.swap(true, Ordering::SeqCst) {
            return Ok(());
        }

            // 在独立线程内运行 Tokio 单线程运行时，规避 Send 要求
            std::thread::spawn(move || {
              let rt = tokio::runtime::Builder::new_current_thread().enable_all().build().unwrap();
              rt.block_on(async {
                if let Err(e) = run_wasapi_loopback().await {
                  eprintln!("[WASAPI] 采集失败: {}", e);
                }
              });
            });
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("仅支持 Windows 平台".into())
    }
}

// 停止系统音频采集（当前实现为幂等标记）
#[tauri::command]
fn stop_system_capture(state: State<'_, CaptureState>) -> Result<(), String> { state.running.store(false, Ordering::SeqCst); Ok(()) }

#[cfg(target_os = "windows")]
async fn run_wasapi_loopback() -> Result<(), String> {
    // 初始化 COM MTA
    let _ = initialize_mta().ok();
    let dev = get_default_device(&Direction::Render).map_err(|e| format!("{e}"))?;
    let mut audio_client = dev.get_iaudioclient().map_err(|e| format!("{e}"))?;
    let sr = 48000usize;
    let channels = 2usize;
    // 目标格式：32bit float / 48k / 双声道
    let desired_format = WaveFormat::new(32, 32, &SampleType::Float, sr, channels, None);
    // 事件驱动共享模式，自动格式转换
    let mode = StreamMode::EventsShared { autoconvert: true, buffer_duration_hns: 200_000 };
    audio_client.initialize_client(&desired_format, &Direction::Capture, &mode).map_err(|e| format!("{e}"))?;
    let _event = audio_client.set_get_eventhandle().map_err(|e| format!("{e}"))?;
    let mut capture = audio_client.get_audiocaptureclient().map_err(|e| format!("{e}"))?;
    audio_client.start_stream().map_err(|e| format!("{e}"))?;

    // 连接本地后端 WebSocket
    let (mut ws, _) = tokio_tungstenite::connect_async("ws://127.0.0.1:8765").await.map_err(|e| format!("{e}"))?;
    // 累积缓冲：保证每次至少 1 秒（16000样本）再发送
    let mut acc: Vec<i16> = Vec::with_capacity(16000 * 2);
    loop {
        let next = capture.get_next_packet_size().map_err(|e| format!("{e}"))?;
        let frames = match next { Some(n) if n > 0 => n as usize, _ => { continue; } };
        let blockalign = desired_format.get_blockalign() as usize;
        let mut raw = vec![0u8; frames * blockalign];
        let (_read_frames, _flags) = capture.read_from_device(&mut raw).map_err(|e| format!("{e}"))?;
        let samples = bytemuck::cast_slice::<u8, f32>(&raw);
        let mut mono: Vec<f32> = Vec::with_capacity(frames);
        for i in 0..frames {
            let l = samples[i*channels + 0];
            let r = samples[i*channels + (channels.min(2) - 1)];
            // f32 双声道 → 单声道
            mono.push(((l + r) * 0.5).clamp(-1.0, 1.0));
        }

        // 线性重采样到 16kHz
        let target_sr = 16000usize;
        let out_len = mono.len() * target_sr / sr;
        let mut resampled: Vec<f32> = Vec::with_capacity(out_len);
        for n in 0..out_len {
            let t = n as f32 * mono.len() as f32 / out_len as f32;
            let i0 = t.floor() as usize;
            let i1 = i0.saturating_add(1).min(mono.len()-1);
            let frac = t - i0 as f32;
            let v = mono[i0] * (1.0 - frac) + mono[i1] * frac;
            resampled.push(v.clamp(-1.0, 1.0));
        }
        // 量化为 i16 并累积
        for v in resampled { acc.push((v * 32767.0).round().clamp(-32768.0, 32767.0) as i16); }
        // 每满 1 秒即发送
        while acc.len() >= 16000 {
            let chunk: Vec<i16> = acc.drain(0..16000).collect();
            let bytes: &[u8] = bytemuck::cast_slice(&chunk);
            ws.send(Message::Binary(bytes.to_vec())).await.map_err(|e| format!("{e}"))?;
        }

        // read() releases buffer internally in wasapi-rs
    }
}

// 已清理虚拟音频设备检查与安装相关命令

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_system_capture, stop_system_capture])
        .manage(CaptureState { running: AtomicBool::new(false) })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
