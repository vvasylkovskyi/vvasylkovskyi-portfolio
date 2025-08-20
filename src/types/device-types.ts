export enum ConnectionStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export type DeviceInfoResponse = {
  data: {
    health_check_info: DeviceInfo;
  };
};

export type BatteryInfoResponse = {
  data: {
    battery_info: BatteryInfo;
  };
};

export type BatteryInfo = {
  charge_level: string;
  temperature: string;
  voltage: string;
  current: string;
  charging_status: string;
};

export type DeviceInfo = {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  uptime_seconds: number;
  device_id: string;
};
