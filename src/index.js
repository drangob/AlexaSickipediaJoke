// Copyright Daniel Horbury 2017

'use strict';

var request = require('request');
var Speech = require('ssml-builder');
var badwords = require('badwords-list');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
	try {
		console.log("event.session.application.applicationId=" + event.session.application.applicationId);

		//only accept requests from my skill 
		 
	if (event.session.application.applicationId !== "amzn1.ask.skill.1caa345c-2118-4fbd-9f30-a15d4693f817") {
		context.fail("Invalid Application ID");
	 }

		if (event.session.new) {
			onSessionStarted({requestId: event.request.requestId}, event.session);
		}

		if (event.request.type === "LaunchRequest") {
			onLaunch(event.request,
				event.session,
				function callback(sessionAttributes, speechletResponse) {
					context.succeed(buildResponse(sessionAttributes, speechletResponse));
				});
		} else if (event.request.type === "IntentRequest") {
			onIntent(event.request,
				event.session,
				function callback(sessionAttributes, speechletResponse) {
					context.succeed(buildResponse(sessionAttributes, speechletResponse));
				});
		} else if (event.request.type === "SessionEndedRequest") {
			onSessionEnded(event.request, event.session);
			context.succeed();
		}
	} catch (e) {
		context.fail("Exception: " + e);
	}
};


function onSessionStarted(sessionStartedRequest, session) {
	console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
		+ ", sessionId=" + session.sessionId);
}

//Skill launched without any intent
function onLaunch(launchRequest, session, callback) {
	console.log("onLaunch requestId=" + launchRequest.requestId
		+ ", sessionId=" + session.sessionId);
	
	var speech = new Speech();
	speech.say("You can ask Sickipedia Jokes to tell you a joke.");
	speech.pause('200ms');
	speech.say("For example");
	speech.pause('100ms');
	speech.say("Sickipedia Jokes"); 
	speech.pause('100ms');
	speech.say("tell me a joke");
	
	var speechOutput = "<speak>" + speech.ssml(true) + "</speak>";
	callback(session.attributes,
		buildSpeechletResponseWithoutCard(speechOutput, "Request now", false));
}

//specific intent
function onIntent(intentRequest, session, callback) {
	console.log("onIntent requestId=" + intentRequest.requestId
		+ ", sessionId=" + session.sessionId);

	var intent = intentRequest.intent,
		intentName = intentRequest.intent.name;

	// if the user asks for a joke, happy days, lets get them one
	if (intentName == 'RequestJoke') {
		handleJokeRequest(intent, session, callback);
	}
	else {
		throw "Invalid intent";
	}
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
	console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
		+ ", sessionId=" + session.sessionId);

}

function getJoke() {


}

//get the joke and send it to the response maker
function handleJokeRequest(intent, session, callback) {

	var options = {
	  url: 'http://www.sickipedia.net/api/Joke/LastWeekHotest?pageIndex=',
	  headers: {
		'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:54.0) Gecko/20100101 Firefox/54.0',
		'Referer': 'http://www.sickipedia.net/Newest'
		}
	};

	request(options, function (error, response, html) {
	  var jokes = JSON.parse(html);

	  var isProfanity = true;

	  var outputArr;
	  //repeat until we get a joke with no profanity
	  while(isProfanity){
		var rand = parseInt(Math.random()*jokes.length);
		var key = jokes[rand];
		var output = JSON.stringify(key.joke);
		isProfanity = badwords.regex.test(output);
		outputArr = output.split(/\\[a-z]?/g);
	  }

	  var speech = new Speech();
	  for (var i = 0; i < outputArr.length; i++) { 
		  if (outputArr[i] != '') {
			speech.say(outputArr[i]);
		  } else {
			speech.pause('100ms');
		  }
	  }
	  var speechOutput = "<speak>" + speech.ssml(true) + "</speak>";

	  callback(session.attributes,
		buildSpeechletResponseWithoutCard(speechOutput, "", "true"));
	});

	
}

// ------- Helper functions to build responses -------



function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
	return {
		outputSpeech: {
			type: "SSML",
			ssml: output
		},
		reprompt: {
			outputSpeech: {
				type: "PlainText",
				text: repromptText
			}
		},
		shouldEndSession: shouldEndSession
	};
}

function buildResponse(sessionAttributes, speechletResponse) {
	return {
		version: "1.0",
		sessionAttributes: sessionAttributes,
		response: speechletResponse
	};
}