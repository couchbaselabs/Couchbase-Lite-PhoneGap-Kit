//
//  Created by Jesse MacFadyen on 10-05-29.
//  Copyright 2010 Nitobi. All rights reserved.
//  Copyright (c) 2011, IBM Corporation
//  Copyright 2011, Randy McMillan
//  Copyright 2012, Andrew Lunny, Adobe Systems
//

#import "ChildBrowserCommand.h"
#import <Cordova/CDVViewController.h>

@implementation ChildBrowserCommand

@synthesize callbackId, childBrowser, CLOSE_EVENT, LOCATION_CHANGE_EVENT, OPEN_EXTERNAL_EVENT;

- (id) initWithWebView:(UIWebView*)theWebView
{
    self = [super initWithWebView:theWebView];

    CLOSE_EVENT = [NSNumber numberWithInt:0];
    LOCATION_CHANGE_EVENT = [NSNumber numberWithInt:1];
    OPEN_EXTERNAL_EVENT = [NSNumber numberWithInt:2];

    return self;
}

- (void) showWebPage:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options // args: url
{	
    self.callbackId = [arguments objectAtIndex:0];
	
    if (self.childBrowser == nil) {
#if __has_feature(objc_arc)
        self.childBrowser = [[ChildBrowserViewController alloc] initWithScale:NO];
#else
        self.childBrowser = [[[ChildBrowserViewController alloc] initWithScale:NO] autorelease];
#endif
        self.childBrowser.delegate = self;
        self.childBrowser.orientationDelegate = self.viewController;
    }

    NSLog(@"showLocationBar %d",(int)[[options objectForKey:@"showLocationBar"] boolValue]);

    [self.viewController presentModalViewController:childBrowser animated:YES];
        
    // objectAtIndex 0 is the callback id
    NSString *url = (NSString*) [arguments objectAtIndex:1];
    
    [self.childBrowser resetControls];
    [self.childBrowser loadURL:url];
    if([options objectForKey:@"showAddress"]!=nil)
        [childBrowser showAddress:[[options objectForKey:@"showAddress"] boolValue]];
    if([options objectForKey:@"showLocationBar"]!=nil)
        [childBrowser showLocationBar:[[options objectForKey:@"showLocationBar"] boolValue]];
    if([options objectForKey:@"showNavigationBar"]!=nil)
        [childBrowser showNavigationBar:[[options objectForKey:@"showNavigationBar"] boolValue]];
}

-(void) close:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options // args: url
{
    [self.childBrowser closeBrowser];
	
}

-(void) onClose
{
    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                      messageAsDictionary:[self dictionaryForEvent:CLOSE_EVENT]];
    [result setKeepCallbackAsBool:YES];

    [self writeJavascript: [result toSuccessCallbackString:self.callbackId]];
}

-(void) onOpenInSafari
{
	CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                      messageAsDictionary:[self dictionaryForEvent:OPEN_EXTERNAL_EVENT]];
    [result setKeepCallbackAsBool:YES];

    [self writeJavascript: [result toSuccessCallbackString:self.callbackId]];
}


-(void) onChildLocationChange:(NSString*)newLoc
{
	NSString* tempLoc = [NSString stringWithFormat:@"%@",newLoc];
	NSString* encUrl = [tempLoc stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding];

    NSMutableDictionary *dict = [NSMutableDictionary dictionaryWithDictionary:[self dictionaryForEvent:LOCATION_CHANGE_EVENT]];

    [dict setObject:encUrl forKey:@"location"];

    CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                      messageAsDictionary:dict];
    [result setKeepCallbackAsBool:YES];

    [self writeJavascript: [result toSuccessCallbackString:self.callbackId]];
}

-(NSDictionary*) dictionaryForEvent:(NSNumber*) event
{
    return [NSDictionary dictionaryWithObject:event forKey:@"type"];
}

#if !__has_feature(objc_arc)
- (void)dealloc
{
    self.childBrowser = nil;

    [super dealloc];
}
#endif

@end
