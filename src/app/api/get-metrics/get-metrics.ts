import {
  BatteryInfo,
  BatteryInfoResponse,
  ConnectionStatus,
  DeviceInfo,
  DeviceInfoResponse,
} from '@/types/device-types';
import { GenericResponse } from '@/types/http-response';

export type CPUMetrics = {
  [key: string]: string;
};

export type GetMetricsResponse = {
  metrics: {
    cpus: CPUMetrics;
  };
};

export const getMetrics = async (): Promise<GetMetricsResponse> => {
  try {
    const metrics = await fetch(`${process.env.VIDEO_SERVICE_URL}/api/v1/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!metrics.ok) {
      console.error('Failed to fetch metrics');
      return {
        metrics: {
          cpus: [],
        },
      };
    }

    const metricsResponseJson: GenericResponse<GetMetricsResponse> = await metrics.json();
    const data: GetMetricsResponse = metricsResponseJson.data;

    return {
      metrics: {
        cpus: [data.metrics.cpus],
      },
    };
  } catch (e) {
    console.error('Error fetching metrics info:', e);
    return {
      metrics: {
        cpus: [],
      },
    };
  }
};
