require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "OnDeviceLLM"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = "https://github.com/ales27pm/native-monGARS"
  s.license        = "MIT"
  s.authors        = { "ales27pm" => "ales@example.com" }
  s.platforms      = { :ios => "13.0" }
  s.source         = { :git => "file:///#{__dir__}" }
  s.source_files   = "ios/**/*.{h,m,mm,swift}"

  # Add the dependency for the tokenizer library
  s.dependency "SentencePiece"
  
  # Explicitly link required system frameworks
  s.frameworks = "CoreML", "Foundation"
  
  s.dependency "React-Core"
  # Add other new architecture dependencies if needed
  # s.dependency "React-Codegen"
  # s.dependency "ReactCommon/turbomodule/core"
end