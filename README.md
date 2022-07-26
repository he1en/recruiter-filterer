# Recruiter Filterer

Recruiter Filterer is a chrome extension that filters unsolicited tech recruiter emails by running an ML model whenever you open gmail. Everything runs in your browser, so your email content never leaves your device!

![](demo.gif)

I've been running this model for several months without any changes, and it's performing wonderfully. It's filtered hundreds of emails from my inbox, and I've only had a few false positives. I guess recruiting emails are very cookie cutter!

## How does it work?
 First, I manually added gmail labels to a couple months worth of recruiting emails in my inbox. Then, I used the gmail api to download all my emails from that time period, and I trained a model using node.js on my local machine. All the code for this is in the `training/` directory. The model is a simple gradient descent model out of the box from tensorflow.js. At a high level, I took every email and turned it into its bigrams (using a simple one-hot encoding I implemented since tensorflow.js does not come with this feature like python tensorflow does), made the most frequent 5000 bigrams  the *only* features, and ran 500 descent epochs to produce weights.

 You can see the trained model in `chrome-extension/model`. It is an asset that can be loaded into a chrome extension! I built this tool as a chrome extension so that I didn't have to maintain a server secure enough to handle all my email content, and so that others wouldn't have to trust my server with their email content to use this tool. When you open gmail, the chrome extension reads all unread emails, runs the model on them, and labels them and marks them as read if they are classified as recruiting.

## Why isn't it available on the chrome extensions store?
The model is trained on my name, role, and company name, so the model won't work well out of the box for anyone else. (If there's interest, I might replace them with a template such as <NAME> in the future). I mostly made this for myself and to brush on up on javascript and play around with tensorflow.

But the main reason I didn't publish it is that Chrome Extensions recently went through an upgrade from "Manifest v2" to "Manifest v3", and new v2 extensions are no longer allowed to be published to the public. This makes sense because v3 contains important security enhancements (the power of chrome extensions is scary!). But as a consequence, v3 disallows third party scripts, and certain unsafe javascript functions (such as eval) that are present in tensorflow.js. So I could not for the life of me figure out how to get tensorflow.js to work with v3. If anyone has gotten this to work, please let me know.

## How can I use it?
Warning: this will be a clunky process. But I figured I should document it anyway, even just to remember how I used this tool. And this process can be used to classify any type of email in your inbox, not just recruiting emails!

### Load the chrome extension to get your gmail auth token
 The code in this repo is enough for a working chrome extension, it's just missing a couple keys you will have to create on your own. Since I couldn't publish the extension (as decribed above), you'll need to set yourself up as a chrome extension developer and get your own gmail API auth token and oauth client id. This process will also set up the chrome extension to be used.

1. Follow the steps "Get the extension key" through "Create OAuth Client ID" in this tutorial: https://bumbu.me/gapi-in-chrome-extension. The chrome extension folder is `chrome-extension`.
2. Save the client ID as an env variable `$OAUTH_CLIENT_ID`, and your new developer public key as `$CHROME_DEV_PUBLIC_KEY`
3. run `npm run build`, which uses the above env variables. You will now have a new `manifest.json` file in the `chrome-extension` folder, as well as new minified javascript ready to run in the extension.
4. Reload the extension in chrome://extensions. The extension should run now, but the model is trained on my information, so you'll want to follow the below steps to build a useful model for yourself.
5. Click the extension icon, then click "inspect popup", then click the "Log auth token" button. This is your auth token!


### Train the model
1. In gmail, label the emails you are trying to identify with a unique label.
2. Save the auth token from the above step as an env variable `$AUTH_TOKEN`
3. Find the gmail label ID assigned to your label from step 1 (mine was Label_8613293660186101195), and replace the value of the `MY_TRAINING_LABEL_ID` constant with this.
4. In the `training` directory, run `node getData.js --latest` to download your emails and save them in labeled folders. You can use the `--backfill` flag to keep downloading more emails, depending on how many you want to train
5. Run `node train.js` to train a model on your emails! It will show output with how well the model performs. If you want, you can tweak inputs, add more data, and repeat.
6. Take the model you like and replace the contents of `chrome-extension/model` with it
7. Reload the chrome extension in chrome://extensions, and you should be good to go!


Feel free to reach out to me with any questions on the above steps.


## Developer notes
Built using node version 18.0.0. I've noticed some build issues using lower versions.