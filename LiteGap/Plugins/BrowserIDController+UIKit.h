//
//  BrowserIDController+UIKit.h
//  TouchWiki
//
//  Created by Jens Alfke on 1/9/13.
//  Copyright (c) 2013 Couchbase. All rights reserved.
//

#import "BrowserIDController.h"

@interface BrowserIDController (UIKit)

/** A UIViewController that contains the BrowserID login UI. */
@property (readonly) UIViewController* viewController;

/** A convenience method that puts the receiver in a UINavigationController and presents it modally
 in the given parent controller. */
- (UINavigationController*) presentModalInController: (UIViewController*)parentController;

@end
