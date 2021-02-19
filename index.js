const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const { finished } = require("stream");

const strip = require("rpi-ws281x-native");

const NUMBER_OF_LEDS = 32; // 32 leds in the Unicorn pHat

strip.init(NUMBER_OF_LEDS);
strip.setBrightness(5); // A value between 0 and 255

// colors
const white = 0xffffff;
const green = 0xff0000;
const red = 0x00ff00;
const blue = 0xff00ff;

// light statuses
const standbyLight = Array(NUMBER_OF_LEDS).fill(white);
const availableLight = Array(NUMBER_OF_LEDS).fill(green);
const busyLight = Array(NUMBER_OF_LEDS).fill(red);
const meetingSoonLight = Array(NUMBER_OF_LEDS).fill(blue);

// Working hours (24hr)  - outside of working hours it will show standByLight
const workStart = 9; // 9am
const workEnd = 18; // 6pm

// initial render before next meeting is known
strip.render(standbyLight);
console.log("Loading...");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), App);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 5 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

async function App(auth) {
  let nextEvents;

  // run fetch
  const fetchRefreshMinutes = 5;
  const fetchInterval = fetchRefreshMinutes * 60 * 1000;
  nextEvents = await fetchNextEvents(auth);
  setInterval(async () => {
    nextEvents = await fetchNextEvents(auth);
  }, fetchInterval);

  // check current status
  const checkStatusRefreshMinutes = 1;
  const checkStatusInterval = checkStatusRefreshMinutes * 60 * 1000;

  setInterval(async () => {
    await checkStatus(nextEvents);
  }, checkStatusInterval);
}

async function fetchNextEvents(auth) {
  let params = {
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: "startTime",
  };

  const calendar = google.calendar({ version: "v3", auth });

  return calendar.events
    .list(params)
    .then((json) => {
      const events = json.data.items;
      // find next non-all day event
      if (events.find((singleEvent) => singleEvent.start.dateTime)) {
        const eventsList = events.filter(
          (singleEvent) => singleEvent.start.dateTime
        );
        eventsList.length = 2;
        return eventsList;
      }
    })
    .catch((err) => {
      console.log("Error: listSingleEvents -" + err);
    });
}

const checkStatus = (nextEvents) => {
  const currentHour = new Date().getHours();

  // Check if in work hours
  if (currentHour >= workStart && currentHour <= workEnd) {
    if (nextEvents) {
      let [eventA, eventB] = nextEvents;

      // check if a meeting if a is starting soon
      if (meetingSoon(eventA, eventB)) {
        strip.render(meetingSoonLight);
        console.log("Meeting starting soon");
      }

      // check if meeting is currently on
      else if (meetingOnNow(eventA, eventB)) {
        strip.render(busyLight);
        console.log("Meeting on now");
      }

      // if nothing on right now show available light
      else {
        strip.render(availableLight);
        console.log("No meetings on right now");
      }
    } else {
      strip.render(availableLight);
      console.log("showing available light");
    }
  }
  // outside of work hours
  else {
    strip.render(standbyLight);
    console.log("Outside of work hours");
  }
};

function meetingSoon(a, b) {
  const meetingWarningMinutes = 5;
  const currentTime = new Date();
  const eventAStartTime = new Date(a.start.dateTime);
  const minsTillA = Math.ceil((new Date(a.start.dateTime) - new Date()) / 60e3);
  const minsTillB = Math.ceil((new Date(b.start.dateTime) - new Date()) / 60e3);
  if (
    (minsTillA > 0 && minsTillA < meetingWarningMinutes) ||
    (minsTillB > 0 && minsTillB < meetingWarningMinutes)
  ) {
    return true;
  }
  return false;
}

function meetingOnNow(a, b) {
  const currentTime = new Date();
  const startTimeA = new Date(a.start.dateTime);
  const endTimeA = new Date(a.end.dateTime);
  const startTimeB = new Date(b.start.dateTime);
  const endTimeB = new Date(b.end.dateTime);
  if (
    (currentTime > startTimeA && currentTime < endTimeA) ||
    (currentTime > startTimeB && currentTime < endTimeB)
  ) {
    return true;
  }
  return false;
}
