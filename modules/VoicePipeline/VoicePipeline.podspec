require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "VoicePipeline"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = "https://github.com/ales27pm/native-monGARS"
  s.license        = "MIT"
  s.authors        = { "ales27pm" => "ales@example.com" }
  s.platforms      = { :ios => "13.0" }
  s.source         = { :git => "file:///#{__dir__}" }
  s.source_files   = "ios/**/*.{h,m,mm,swift}"
  
  # Explicitly link the required system frameworks for voice processing
  s.frameworks = "Speech", "AVFoundation"

  s.dependency "React-Core"
end