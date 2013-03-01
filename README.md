Couchbase Cordova Kit
========

Container for building HTML5 mobile apps with PhoneGap and Couchbase Lite, which can sync via [Couchbase Mobile](https://github.com/couchbaselabs/mobile)

You edit `www/`,  and save JSON documents to Couchbase Lite via local Ajax calls. which sync via the cloud to other mobile devices and users. Data on the local device means a snappy user experience. Sync via the cloud adds opportunties for multiuser interaction.

Here's what saving a form entry to the database could look like in your app:

```javascript
$(function(){
	$("form").submit(function() {
		$.ajax("http://lite.couchbase./mydb", {
			dataType : "json",
			type : "POST",
			data : $(this).serializeArray(),
			success : function(meta) {
				console.log("saved your document "+ meta.id);
			}
		});
		return false;
	});
});
```

## Learn More

One place to start is [Chris' recent blog posts](http://blog.couchbase.com/j) on the Couchbase blog. Or look at [CouchChat](https://github.com/couchbaselabs/CouchChat-iOS) if you just want a clean example.

NOTE: We are updating the examples to the latest Sync Gateway capabilities, so for now we've left master branch clean as something that works but doesn't do much. You can use Ajax libraries like jQuery to save data by posting JSON to `http://lite.couchbase./mydb/` (you need to add this to your whitelist.)

## Try the examples

If you want to see an up to date example app, look at [CouchChat](https://github.com/couchbaselabs/CouchChat-iOS). We are updating the HTML5 examples now, contact @jchris on Twitter to help...

There are example apps (currently a chat app, with an HTML5 Markdown wiki on the way) living in the `$PROJECT_ROOT/examples/` directory. To install the example chat app, simply follow these steps:

* Remove the existing directory from `$PROJECT_ROOT/www`
* Make a symlink so that the `$PROJECT_ROOT/examples/chat/www` directory shows up at `$PROJECT_ROOT/www/`. You can do this by running `ln -s examples/chat/www www`
* Now you are ready to build the app and check it out on your simulator.

Follow the rest of these steps to enable sync between multiple devices and the cloud.

* Did I mention you need [node.js](http://nodejs.org/) installed for the app server? Version 0.8 or greater will do.
* Install [Couchbase Server 2.0 or newer](http://www.couchbase.com/couchbase-server/overview)
* Install the [Couchbase Sync Gateway](https://github.com/couchbaselabs/sync_gateway) somewhere your mobile devices will be able to access it. This can be on your workstation, if you are only testing on the simulator or with devices connected via local wi-fi. For deployments, this Sync Gateway (as well as the node.js server process) need to be reachable from the public internet.

Once you have the components installed, launch them in this order:

* Couchbase Server
* the Sync Gateway
* Then launch the node.js server by running `SYNC_HOSTNAME=myworkstation.local node www/examples/chat/server/serve.js`

You will need to edit the file at `$PROJECT_ROOT/www/js/app/config.js` to replace "animal.local" with the hostname at which your iOS device or Simulator should look to find the Sync Gateway and the node.js server. You can look at `config.js` to see that we expect these services to run on the default ports. Feel free to edit stuff there to fit your deployment.

Now that you have edited the example app to look in the right place on the network, build and run it (again) from Xcode. Note that the `serve.js` process also does some JavaScript packaging inside the `www` directory so you need to have it running if you are editing the app code and expect to see your changes in the app. This should probably be moved to the Xcode build step. Pull request request. :)

You can test to see that stuff is indeed synced to Couchbase Server, by quitting the app in the simulator, deleting it, and then re-launching it from Xcode. If you enter the same username and password combination as you did the first time around, then a few seconds later you should see any chat rooms you created the first time around, reappear on the screen.

Or you could run it on multiple devices, with the same credentials. If you do that, you should see changes flow between the devices as they are made.

## The Tech

The project uses Apache Cordova as a base layer, with the goal to abtract the TouchDB integration to a Cordova Plugin. For now, someone will have to update TouchDB and Cordova manually in this project. Once the plugin integration is done, these example apps should only need to include a `www/` folder, and work with boilerplate Cordova and TouchDB.


## Contribute

Right now we need big help in packaging the Objective-C bits as a plugin, so that it can be used on PhoneGap Build. [Join our mailing list](https://groups.google.com/forum/#!forum/mobile-couchbase) to help out.



