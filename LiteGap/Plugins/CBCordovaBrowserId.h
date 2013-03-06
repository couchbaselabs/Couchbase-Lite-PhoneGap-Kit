#import <Cordova/CDV.h>
#import "BrowserIDController+UIKit.h"

@interface CBCordovaBrowserId : CDVPlugin <BrowserIDControllerDelegate>

@property (nonatomic, strong) CDVInvokedUrlCommand *command;

- (void)presentBrowserIdDialog:(CDVInvokedUrlCommand*)urlCommand;

@end
