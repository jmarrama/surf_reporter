var page = require('webpage').create();

var wind_speed;
var wind_dir;
var wind_dir_deg;
var wave_height;
var surfline_rating;
var surfline_rating_str;

// TODO: add sf buoy
// TODO: add wave period into calculations
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

	// wave score, sort of
	if (wave_height > 3) {
		score += 1;
	}

	// surfline rating always helps
	score += surfline_rating;
	return score;
}

function analyze_data()
{
	console.log("wind speed and dir:");
	console.log(wind_speed +" mph from " +wind_dir + " " + wind_dir_deg);
	console.log("wave height\t"+wave_height+"\tsurfline rating\t" + surfline_rating);

	if (calculate_score() > 0) {
		// its a go! build up a string
		var go_str = "Hey brah, Shredgnar Mc.Chill here. It looks like the surf is worth checking at OB. The winds are currently " +
			wind_speed +" mph from " +wind_dir + " " + wind_dir_deg + " and the surf is " + wave_height +
			"ft. Surfline is calling it " + surfline_rating_str;

		return {'send': 'yes', 'body': "body="+go_str};
	}
	return {'send': null};
}

function extract_surfline_data(height_str, rating_str)
{
	// first, extract height as the average of the possible range
	var matches = height_str.match(/\d{1,2}/g);
	if (matches[0] && matches[1]) {
		wave_height = (parseInt(matches[0]) + parseInt(matches[1]))/2;
	} else if (matches[0]) {
		wave_height = parseInt(matches[0]);
	} else {
		console.err("Data extraction for surfline wave height failed!");
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
	var obkc_regex = /F\s*\|\s*(.*)\s*\((\d*).*@\s*(.{1,5})\smph/;
	var matches = data.match(obkc_regex);
	if (matches) {
		wind_speed = parseInt(matches[3].trim());
		wind_dir = matches[1].trim();
		wind_dir_deg = parseInt(matches[2].trim());
	} else {
		console.err("Data extraction failed for ob-kc!");
	}
}

page.open("http://www.ob-kc.com/images/wx2.html", function (status) {

	if (status === 'fail') {
		console.err("Failed fetching ob-kc!");
	} else {
		var data = page.evaluate(function () {
			return document.querySelector('span.style16').innerText;
		});
		extract_obkc_data(data);
	}

	// onto surfline!
	page.open("http://www.surfline.com/surf-report/south-ocean-beach-central-california_4128/", function (status) {
		if (status === 'fail') {
			console.err("Failed fetching surfline!");
		} else {
			var report = page.evaluate(function () {
				return [document.querySelector('#observed-spot-conditions').innerText, document.querySelector('#observed-wave-range').innerText];
			});
			extract_surfline_data(report[1], report[0]);

			// finally, analyze the data
			var final_data = analyze_data();

			// finally, send out the mail
			if (final_data.send) {
				page.open("http://localhost:8123", "post", final_data.body, function (status) {
					if (status === 'fail') {
						console.err("Failed sending email!");
					} else {
						console.log("Alerted the masses!");
					}

					page.close();
					phantom.exit();
				});
			} else {
				page.close();
				phantom.exit();
			}
		}
	});
});

