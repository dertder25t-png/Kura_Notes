use std::time::{Duration, Instant};
use battery::{Manager, State as BatteryState};
use sysinfo::{Components, System};

pub struct AiState {
    pub generator_model: Option<String>,
    pub selected_model: Option<String>,
    pub ollama_url: Option<String>,
    pub last_accessed: Instant,
    pub last_generation_time: Option<Instant>,
    pub sys: System,
    pub components: Components,
}

impl AiState {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        let components = Components::new_with_refreshed_list();

        Self {
            generator_model: None,
            selected_model: None,
            ollama_url: None,
            last_accessed: Instant::now(),
            last_generation_time: None,
            sys,
            components,
        }
    }

    pub fn is_system_healthy(&mut self) -> Result<(), &'static str> {
        self.sys.refresh_cpu();
        let cpu_usage = self.sys.global_cpu_info().cpu_usage();

        if cpu_usage > 75.0 {
            return Err("CPU_THROTTLED");
        }

        self.components.refresh();
        let thermal_limit = std::env::var("KURA_THERMAL_LIMIT_C")
            .ok()
            .and_then(|value| value.parse::<f32>().ok())
            .unwrap_or(85.0);

        let thermal_spike = self.components.iter().any(|component| {
            let temperature = component.temperature();
            temperature.is_finite() && temperature >= thermal_limit
        });
        if thermal_spike {
            return Err("THERMAL_THROTTLED");
        }

        if let Some(last_generation_time) = self.last_generation_time {
            if last_generation_time.elapsed() < Duration::from_secs(60) {
                return Err("RATE_LIMITED");
            }
        }

        if std::env::var("KURA_FORCE_BATTERY_SAVER")
            .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
        {
            return Err("BATTERY_SAVER");
        }

        // Best-effort battery check. If unsupported on a system, we skip without blocking.
        if let Ok(manager) = Manager::new() {
            if let Ok(mut batteries) = manager.batteries() {
                while let Some(Ok(battery)) = batteries.next() {
                    let level = battery.state_of_charge().value;
                    if battery.state() == BatteryState::Discharging && level <= 0.20 {
                        return Err("BATTERY_SAVER");
                    }
                }
            }
        }

        Ok(())
    }
}
