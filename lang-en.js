lang = "en";

if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) { 
			return typeof args[number-0] != 'undefined'
				? args[number-0] : match;
		});
	};
}

localize = (function(){
	var msgs = {};
	var msg = function(m) {
		msgs[m] = m;
	};


	// header messages
	msg("Timetable to Cron");
	
	// list-view messages
	msg("List of saved schedules");
	msg("Active");
	msg("Activate");
	msg("No saved schedules");
	msg("Create a schedule");

	// single-view messages
	msg("Schedules");
	msg("active");
	msg("Schedule");
	msg("+");
	msg("remove tab");
	msg("x");
	msg("Add entry");
	msg("Save");

	//Days
	msg("monday");
	msg("tuesday");
	msg("wednesday");
	msg("thursday");
	msg("friday");
	msg("saturday");
	msg("sunday");

	//Console Error messages
	msg("Failed to fetch the list of saved schedules.");
	msg("Failed to load the schedule.");

	//Prompts
	msg("Enter the name of the day");
	msg("Name the schedule");

	//Formatted messages
	msg("The entry {0}#{1} had unparsed Moments!");
	msg("Start time is not before the End time, for entry {0}#{1} !");
	msg("{0}#{1} overlaps with {0}#{2} !");


	var _ = function(m) { return msgs[m]||m; };
	return function(str) {
		if (arguments.length > 1) {
			var args = Array.prototype.slice.apply(arguments, [1]);
			return String.prototype.format.apply(_(str), args);
		}

		return _(str);
	};
}());