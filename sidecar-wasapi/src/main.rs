use tokio_tungstenite::tungstenite::Message;
use futures_util::SinkExt;
use wasapi::{Direction, StreamMode, WaveFormat, SampleType, initialize_mta, get_default_device};

 

#[cfg(target_os = "windows")]
async fn run_wasapi_loopback() -> Result<(), String> {
    let _ = initialize_mta().ok();
    let dev = get_default_device(&Direction::Render).map_err(|e| format!("{e}"))?;
    let mut audio_client = dev.get_iaudioclient().map_err(|e| format!("{e}"))?;
    let sr = 48000usize;
    let channels = 2usize;
    let desired_format = WaveFormat::new(32, 32, &SampleType::Float, sr, channels, None);
    let mode = StreamMode::EventsShared { autoconvert: true, buffer_duration_hns: 200_000 };
    audio_client.initialize_client(&desired_format, &Direction::Capture, &mode).map_err(|e| format!("{e}"))?;
    let _event = audio_client.set_get_eventhandle().map_err(|e| format!("{e}"))?;
    let capture = audio_client.get_audiocaptureclient().map_err(|e| format!("{e}"))?;
    audio_client.start_stream().map_err(|e| format!("{e}"))?;

    let mut ws: Option<_> = None;
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
            mono.push(((l + r) * 0.5).clamp(-1.0, 1.0));
        }
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
        for v in resampled { acc.push((v * 32767.0).round().clamp(-32768.0, 32767.0) as i16); }
        while acc.len() >= 16000 {
            let chunk: Vec<i16> = acc.drain(0..16000).collect();
            let bytes: &[u8] = bytemuck::cast_slice(&chunk);
            if ws.is_none() {
                println!("[sidecar] connecting ws://127.0.0.1:8765");
                match tokio_tungstenite::connect_async("ws://127.0.0.1:8765").await {
                    Ok((stream, _)) => { ws = Some(stream); println!("[sidecar] ws connected"); }
                    Err(err) => { println!("[sidecar] ws connect failed: {}", err); tokio::time::sleep(std::time::Duration::from_millis(500)).await; continue; }
                }
            }
            if let Some(ref mut stream) = ws {
                if let Err(e) = stream.send(Message::Binary(bytes.to_vec())).await {
                    println!("[sidecar] ws send error: {}", e);
                    ws = None;
                } else {
                    println!("[sidecar] sent 16000 samples");
                }
            }
        }
    }
}

#[cfg(target_os = "windows")]
#[tokio::main(flavor = "current_thread")]
async fn main() { let _ = run_wasapi_loopback().await; }

#[cfg(not(target_os = "windows"))]
fn main() {}
