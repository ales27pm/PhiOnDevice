import Foundation
import CoreML

@objc class Phi4MiniRunner: NSObject {
  @objc static let shared = Phi4MiniRunner()
  private var model: MLModel?
  
  private override init() {
    super.init()
    if let url = Bundle.main.url(forResource: "Phi4QuebecChat_int4", withExtension: "mlmodelc") {
      model = try? MLModel(contentsOf: url)
    }
  }
  
  @objc func generate(_ prompt: String, options: NSDictionary?) -> String? {
    guard let model = model else { return nil }
    // TODO: Insert tokenizer integration here (see notes at end)
    let tokenIds = [Int32]() // Should tokenize prompt here.
    let inputLen = 1024
    let inputIds = try! MLMultiArray(shape: [1, inputLen] as [NSNumber], dataType: .int32)
    let attnMask = try! MLMultiArray(shape: [1, inputLen] as [NSNumber], dataType: .int32)
    for i in 0..<min(tokenIds.count, inputLen) {
      inputIds[[0, i] as [NSNumber]] = NSNumber(value: tokenIds[i])
      attnMask[[0, i] as [NSNumber]] = 1
    }
    guard let output = try? model.prediction(
      from: Phi4QuebecChat_int4Input(input_ids: inputIds, attention_mask: attnMask)
    ) as? Phi4QuebecChat_int4Output else { return nil }
    // TODO: Decode output to string
    return "TODO: Detokenize result"
  }
}