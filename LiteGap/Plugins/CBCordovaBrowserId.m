#import "CBCordovaBrowserId.h"
#import <Cordova/CDV.h>

@implementation CBCordovaBrowserId

@synthesize command;

- (id) initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];

    // todo capture the web view here instead of fishing it out in the command

    return self;
}

- (void)presentBrowserIdDialog:(CDVInvokedUrlCommand*)urlCommand
{
    if (self.command != nil) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"There is already a browserid call in progress"] callbackId:urlCommand.callbackId];
        return;
    }
    self.command = urlCommand;

    // present modal controller, set us as the delegate
    BrowserIDController* browserIDController = [[BrowserIDController alloc] init];
    browserIDController.origin = [NSURL URLWithString:[urlCommand.arguments objectAtIndex:0]];
    browserIDController.delegate = self;

    id rootVC = [[[[[UIApplication sharedApplication] keyWindow] subviews] objectAtIndex:0] nextResponder];
    [browserIDController presentModalInController: rootVC];
}

- (void) dismissBrowserIDController: (BrowserIDController*) browserIDController {
    [browserIDController.viewController dismissViewControllerAnimated: YES completion: NULL];
}

- (void) browserIDControllerDidCancel: (BrowserIDController*) browserIDController {
    [self dismissBrowserIDController: browserIDController];
    // send error back to javascript
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"canceled"];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.command.callbackId];
    self.command = nil;
}

- (void) browserIDController: (BrowserIDController*) browserIDController
           didFailWithReason: (NSString*) reason
{
    [self dismissBrowserIDController: browserIDController];
    // send error back to javascript
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:reason];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.command.callbackId];
    self.command = nil;
}

- (void) browserIDController: (BrowserIDController*) browserIDController
     didSucceedWithAssertion: (NSString*) assertion
{
    [self dismissBrowserIDController: browserIDController];
    // send assertion back to javascript
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:assertion];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.command.callbackId];
    self.command = nil;
}

@end
