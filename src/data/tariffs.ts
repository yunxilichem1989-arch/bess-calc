import type { TariffProfile } from '../lib/types'

export const TARIFFS: TariffProfile[] = [
  {
    province: '上海',
    sharpPeakPrice: 1.387,
    peakPrice: 1.145,
    flatPrice: 0.694,
    valleyPrice: 0.308,
    deepValleyPrice: 0.257,
    peakWindows: [[8, 11], [13, 15], [18, 21]],
    valleyWindows: [[23, 24], [0, 7]],
  },
  {
    province: '广东',
    sharpPeakPrice: 1.418,
    peakPrice: 1.148,
    flatPrice: 0.726,
    valleyPrice: 0.301,
    peakWindows: [[10, 12], [14, 19]],
    valleyWindows: [[0, 8], [22, 24]],
  },
  {
    province: '浙江',
    sharpPeakPrice: 1.358,
    peakPrice: 1.089,
    flatPrice: 0.661,
    valleyPrice: 0.286,
    deepValleyPrice: 0.234,
    peakWindows: [[8, 11], [13, 15], [17, 21]],
    valleyWindows: [[23, 24], [0, 7]],
  },
  {
    province: '江苏',
    peakPrice: 1.122,
    flatPrice: 0.687,
    valleyPrice: 0.253,
    peakWindows: [[8, 12], [17, 21]],
    valleyWindows: [[0, 8], [22, 24]],
  },
  {
    province: '手动输入',
    peakPrice: 1.0,
    flatPrice: 0.65,
    valleyPrice: 0.35,
    peakWindows: [[8, 12], [17, 21]],
    valleyWindows: [[0, 8], [22, 24]],
  },
]

export const DEFAULT_TARIFF = TARIFFS[0]
