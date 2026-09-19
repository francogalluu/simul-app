Pod::Spec.new do |s|
  s.name           = 'SimulChart'
  s.version        = '1.0.0'
  s.summary        = 'Smooth SwiftUI line chart for Simul'
  s.description    = 'A Swift Charts line/area chart with a smoothed curve, exposed to React Native.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
