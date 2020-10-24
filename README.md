# Google calendar busy light

A light that shines red when you're in the middle of a google calendar event (non-all day events). Aimed to help others in your household or workplace not disturb you when you're in a meeting.

## Prerequisites

To use this project you will need:

- A Raspberry PIi zero with Raspberry Pi OS or similar installed
- Node installed on your Rasberry Pi. You can follow [this tutorial](http://www.thegeekstuff.com/2015/10/install-nodejs-npm-linux).
- [Pimoroni Mood light kit](https://shop.pimoroni.com/products/mood-light-pi-zero-w-project-kit) or [Unicorn Phat](https://shop.pimoroni.com/products/unicorn-phat)
- A google account

## Setup

1. Clone this repo onto your Rasberry Pi `git clone https://github.com/adamgparsons/google-calendar-busy-light.git` then `cd` into the directory.
2. Enable the Google Calendar API by going to [this page](https://developers.google.com/calendar/quickstart/nodejs) and clicking on 'Enable the Google Calendar API'. Then download and copy the `credentials.json` to your google-calendar-busy-light directory.
3. Run `npm i` to install the dependencies
4. To run the application `sudo node index.js`.
   I have not figured out how do this with out sudo. If it is your first time running the application you will need to follow the link in the terminal to get the google auth code and enter it.

## Changing API fetch intervals

You can change the API fetch interval by changing the `fetchRefreshMinutes` value.

## Running script on Pi startup

1. Edit the crontab by typing `crontab -e`
2. Select nano editor
3. Go to the last line and add `@reboot cd /home/pi/google-calendar-busy-light/ && sudo node index.js `
4. Hit control o to write out then control x to exit
5. Reboot Pi
