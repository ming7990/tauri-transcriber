#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use reqwest;
use tauri::Manager;

#[tauri::command]
fn has_virtual_device() -> bool {
    #[cfg(target_os = "windows")]
    {
        // 尝试多种方法检测虚拟音频设备
        
        // Method 1: Use Get-AudioDevice command (if AudioDeviceCmdlets module is installed)
        let output1 = Command::new("powershell")
            .args(&["-Command", "Get-AudioDevice -List | Select-String 'CABLE'"])
            .output();
        
        if let Ok(result) = output1 {
            if !result.stdout.is_empty() {
                return true;
            }
        }
        
        // 方法2: 使用 Windows 内置的音频设备命令
        let output2 = Command::new("powershell")
            .args(&["-Command", "Get-CimInstance Win32_SoundDevice | Select-Object Name | Where-Object {$_.Name -like '*CABLE*'}"])
            .output();
        
        if let Ok(result) = output2 {
            if !result.stdout.is_empty() {
                return true;
            }
        }
        
        // 方法3: 尝试使用 mmdeviceapi 命令列出所有音频设备
        let output3 = Command::new("powershell")
            .args(&["-Command", "(New-Object -ComObject MMDeviceEnumerator).EnumerateAudioEndPoints(1, 1) | ForEach-Object {$_.FriendlyName} | Where-Object {$_.Contains('CABLE')}"])
            .output();
        
        if let Ok(result) = output3 {
            if !result.stdout.is_empty() {
                return true;
            }
        }
    }
    
    false
}

#[derive(serde::Serialize)]
struct InstallResult {
    success: bool,
    error: Option<String>,
}

#[tauri::command]
async fn install_virtual_device() -> Result<InstallResult, String> {
    #[cfg(target_os = "windows")]
    {
        use std::path::Path;
        use std::fs::File;
        use std::io::copy;
        use std::process::Command;
        
        // VB-CABLE 下载链接
        let url = "https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip";
        let zip_path = "C:\\temp\\vbcable.zip";
        let extract_dir = "C:\\temp\\vbcable";
        
        // 确保临时目录存在
        std::fs::create_dir_all("C:\\temp").map_err(|e| e.to_string())?;
        
        // 下载 VB-CABLE
        match reqwest::get(url).await {
            Ok(response) => {
                if response.status().is_success() {
                    let mut file = File::create(zip_path).map_err(|e| e.to_string())?;
                    let mut content = std::io::Cursor::new(response.bytes().await.map_err(|e| e.to_string())?);
                    copy(&mut content, &mut file).map_err(|e| e.to_string())?;
                } else {
                    return Ok(InstallResult {
                        success: false,
                        error: Some(format!("下载失败，状态码: {}", response.status())),
                    });
                }
            },
            Err(e) => {
                return Ok(InstallResult {
                    success: false,
                    error: Some(format!("下载出错: {}", e)),
                });
            }
        }
        
        // 解压 ZIP 文件
        if Path::new(extract_dir).exists() {
            std::fs::remove_dir_all(extract_dir).map_err(|e| e.to_string())?;
        }
        std::fs::create_dir_all(extract_dir).map_err(|e| e.to_string())?;
        
        // 使用 PowerShell 解压
        let extract_result = Command::new("powershell")
            .args(&[
                "-Command", 
                &format!("Expand-Archive -Path '{}' -DestinationPath '{}' -Force", zip_path, extract_dir)
            ])
            .output();
        
        if let Err(e) = extract_result {
            return Ok(InstallResult {
                success: false,
                error: Some(format!("解压失败: {}", e)),
            });
        }
        
        // 以管理员权限运行安装脚本
        let install_script = format!("{}\\VBCABLE_Setup_x64.exe", extract_dir);
        let install_result = Command::new("powershell")
            .args(&[
                "-Command", 
                &format!("Start-Process '{}' -ArgumentList '-i' -Verb RunAs -Wait", install_script)
            ])
            .output();
        
        match install_result {
            Ok(_) => {
                Ok(InstallResult {
                    success: true,
                    error: None,
                })
            },
            Err(e) => {
                Ok(InstallResult {
                    success: false,
                    error: Some(format!("安装失败: {}", e)),
                })
            }
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Ok(InstallResult {
            success: false,
            error: Some("虚拟设备安装仅支持 Windows 系统".to_string()),
        })
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            has_virtual_device,
            install_virtual_device
        ])
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            window.set_always_on_top(true).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}