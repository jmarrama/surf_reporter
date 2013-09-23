var wind_speed;
var wind_dir;
var wind_dir_deg;
var wave_height;
var surfline_rating;
var surfline_rating_str;
var swell_height;
var swell_period;

/*
 * Calculates the 'score' of the surf at ob.
 */
function calculate_score()
{
	var score = 0;

	// wind should count for a lot at ob
	if (wind_dir_deg > 30 && wind_dir_deg < 150) {
		score += 3; // go, for sure
	} else if ((wind_dir_deg >= 0 || wind_dir_deg < 180) && wind_speed < 10) {
		score += 2; // likely a go
	} else if (wind_speed < 5) {
		score += 1; // meh
	}

	// having a long period swell is also quite nice
	if (swell_period >= 15) {
		score += 2;
	} else if (swell_period >= 13) {
		score += 1;
	}

	// surfline rating always helps
	score += surfline_rating;

	// we don't want it to be completely flat
	// also discount small windswell
	if (swell_height < 1.5 && wave_height < 1.5) {
		score = score/2;
	} else if (swell_height < 2.5 && swell_period < 7.5) {
		score -= 1;
	}

	return score;
}

function analyze_data()
{
	console.log("wind speed and dir:");
	console.log(wind_speed +" mph from " +wind_dir + " " + wind_dir_deg);
	console.log("wave height\t"+wave_height+"\tsurfline rating\t" + surfline_rating);
	console.log("the swell is "+swell_height+" ft at "+swell_period+" seconds");

	if (calculate_score() > 3) {
		// its a go! build up a string
		var go_str = "Hey brah, Shredgnar Mc.Shred here. " +
			"It looks like the surf is worth checking at OB. The winds are currently " +
			wind_speed +" mph from " + wind_dir + " " + wind_dir_deg +
			" and the swell is " + swell_height + " feet at " + swell_period +
			" seconds. Surfline is calling it " + surfline_rating_str;

		return {'send': 'yes', 'body': "body="+go_str};
	}
	return {'send': null};
}

function extract_surfline_data(height_str, rating_str)
{
	// first, extract height as the average of the possible range
	var matches = height_str.match(/\d{1,2}/g);
	if (matches[0] && matches[1]) {
		wave_height = (parseInt(matches[0], 10) + parseInt(matches[1], 10))/2;
	} else if (matches[0]) {
		wave_height = parseInt(matches[0], 10);
	} else {
		console.error("Data extraction for surfline wave height failed!");
	}

	surfline_rating_str = rating_str;
	if (rating_str.match(/epic/i)) {
		surfline_rating = 3;
	} else if (rating_str.match(/good/i)) {
		surfline_rating = 2;
	} else if (rating_str.match(/fair/i)) {
		surfline_rating = 1;
	} else {
		surfline_rating = 0;
	}
}

function extract_obkc_data(data)
{
	// extract the weather data with regex hack!
	var matches = data.match(/F\s*\|\s*(.*)\s*\((\d*).*@\s*(.{1,5})\smph/);
	if (matches) {
		 wind_speed = parseInt(matches[3].trim(), 10);
		 wind_dir = matches[1].trim();
		 wind_dir_deg = parseInt(matches[2].trim(), 10);
	} else {
		 console.error("Data extraction failed for ob-kc!");
	}
}

var obkc = require('webpage').create();
var surfline = require('webpage').create();
var sfbuoy = require('webpage').create();
var mailman = require('webpage').create();

var obkc_url = "http://www.ob-kc.com/images/wx2.html";
var surfline_url = "http://www.surfline.com/surf-report/south-ocean-beach-central-california_4128/";
var mailman_url = "http://localhost:8123";
var sfbuoy_url = "http://www.ndbc.noaa.gov/station_page.php?station=46026";

obkc.open(obkc_url, function (status) {
	if (status === 'fail') {
		console.error("Failed fetching ob-kc!");
	} else {
		var data = obkc.evaluate(function () {
			return document.querySelector('span.style16').innerText;
		});
		extract_obkc_data(data);
	}
	obkc.close();

	// onto surfline!
	surfline.open(surfline_url, function (status) {
		if (status === 'fail') {
			console.error("Failed fetching surfline!");
		} else {
			var report = surfline.evaluate(function () {
				return [document.querySelector('#observed-spot-conditions').innerText,
					document.querySelector('#observed-wave-range').innerText];
			});
			extract_surfline_data(report[1], report[0]);
		}
		surfline.close();

		// onto the sf buoy
		sfbuoy.open(sfbuoy_url, function (status) {
			if (status === 'fail') {
				console.error("Failed fetching sf buoy!");
			} else {
				var buoy_data = sfbuoy.evaluate(function () {
					var tds = document.querySelector("caption.titleDataHeader").parentNode.getElementsByTagName('td');
					return [parseFloat(tds[12].innerText), parseFloat(tds[15].innerText)];
				});
				swell_height = buoy_data[0];
				swell_period = buoy_data[1];
			}
			sfbuoy.close();

			// analyze the collected data and send mail if appropriate
			var final_data = analyze_data();
			if (final_data.send) {
				mailman.open(mailman_url, "post", final_data.body, function (status) {
					if (status === 'fail') {
						console.error("Failed sending email!");
					} else {
						console.log("Alerted the masses!");
					}
					mailman.close();
					phantom.exit();
				});
			} else {
				phantom.exit();
			}
		});
	});
});
