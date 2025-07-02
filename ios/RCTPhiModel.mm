#import "RCTPhiModel.h"
#import "YourApp-Swift.h"

@implementation RCTPhiModel
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(generate:(NSString *)prompt
                  options:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSString *result = [Phi4MiniRunner.shared generate:prompt options:options];
    if (result) {
      resolve(result);
    } else {
      reject(@"inference_error", @"Model inference failed", nil);
    }
  });
}

// Add event emitter compatibility (even if not used)
RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {}
RCT_EXPORT_METHOD(removeListeners:(double)count) {}

@end