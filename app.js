var app = angular.module("crontimetable", ['moment-picker', 'ui.bootstrap', 'ngRoute']);

app.config(function($routeProvider) {
    $routeProvider
    .when("/", {templateUrl: "list-view.html"})
    .when("/active", {templateUrl : "single-view.html"})
    .when("/:saved_name", {templateUrl : "single-view.html"});
});

app.value("my_config", {
		"first_start_time": moment("07:30", "hh:mm"),
		"entry_duration": moment("00:45", "hh:mm"),
		"min_margin": moment("00:05", "hh:mm"),
		"list_refresh_delay": 2000, //ms
		"active_schedule_start_pattern": /\s*\@\s*/
	}
);


app.run(["$rootScope", function($rootScope) {
	$rootScope["_"] = function() {
		return localize.apply(null, arguments);
	};
}]);


app.service("delay", ["$q", function($q) {
	return function(delay) {
		return $q(function(resolve) {setTimeout(resolve, delay)});
	};
}])

app.controller("listCtrl", ["$scope", "$http", "delay", "my_config", function($scope, $http, delay, config) {
	var _ = localize;

	var init = function() {
		$http.get("schedule.php?list")
		.then(function(response) {
			var data = response.data;
			data.map(name => decodeURI(name));

			$scope.activeIndex = 0;
			$scope.schedules = data;
		})
		.catch(function() {
			console.error(_("Failed to fetch the list of saved schedules."));
		});
	};

	$scope.activateSchedule = function(index) {
		if (!$scope.schedules || index < 0 || index >= $scope.schedules.length)
			return false;

		var name = $scope.schedules[index];
		$http.get("schedule.php?activate="+name)
			.then(function() {
				$scope.activeIndex = index;
				return delay(config.list_refresh_delay);
			})
			.then(init);
	};

	init();
}]);


app.service("dayName", [function() {
	var _ = localize;
	var names = [_("sunday"), _("monday"), _("tuesday"), _("wednesday"), _("thursday"), _("friday"), _("saturday"), _("sunday")];
	return {
		toName: function(day) {
			return names[day%names.length]||"";
		},
		toIndex: function(day) {
			if (!day) return -1;
			return names.indexOf(day.trim().toLowerCase());
		}
	};
}]);

app.controller("scheduleCtrl", ["$scope", "$http", "$routeParams", "my_config", "dayName", function($scope, $http, $routeParams, config, dayName) {
	var _ = localize;
	$scope.ready = false;

	var schedule_name = ($routeParams.saved_name||"").replace(config.active_schedule_start_pattern, "");
	$scope.schedule = {days:[]}
	$scope.activeTab = 1;

	$http.get("schedule.php?" +(!schedule_name? "active" : "name="+schedule_name))
		.then(function(response) {
			$scope.loadSchedule(response.data);

			if (!schedule_name)
				schedule_name = (response.headers()["x-schedule-name"]||"").replace(config.active_schedule_start_pattern, "");

			$scope.is_the_active_schedule = (response.headers()["x-schedule-active"]-0)? true:false;

			$scope.schedule_name = schedule_name;
			$scope.ready = true;
		})
		.catch(function() {
			$scope.error = _("Failed to load the schedule.");
		});


	var ucfirst = function(str) {
		return str.replace(/(.)(.*)/, function(w,f,r) {return f.toUpperCase() + r.toLowerCase()});
	};


	$scope.shouldShowCloseButtons = (function(){
		var doShow = false;
		return function(flag) {
			if (typeof flag != 'undefined')
				doShow = flag;
			else
				return doShow;
		};
	}());


	$scope.addDay = function() {
		var next = ucfirst(dayName.toName($scope.schedule.days.length+1));
		var name = prompt(_("Enter the name of the day"), next);
		if (name === null) return;
		if (!name) name = next;
		var day = {"name":name, "entries":[]};
		$scope.schedule.days.push(day);

		setTimeout(function() {
			$scope.activeTab = $scope.schedule.days.length;
			$scope.$apply();
		}, 10);
	};

	$scope.removeDay = function(list, index) {
		list.splice(index, 1);
	};

	$scope.addEntry = function(list) {
		var e = {};

		var st;
		if (list.length > 0)
			st = list[list.length-1].endMoment.clone().add(config.min_margin);
		else
			st = config.first_start_time;
		e.startMoment = moment(st, "hh:mm");


		e.endMoment = e.startMoment.clone().add(config.entry_duration);

		list.push(e);
	};

	$scope.removeEntry = function(list, index) {
		list.splice(index, 1);
	};

	$scope.propagateChange = function(entry) {
		if (!entry.dirty)
			entry.endMoment = entry.startMoment.clone().add(config.entry_duration);
	};

	$scope.markDirty = function(entry) {
		entry.dirty = true;
	};


	var dayLineRegex = /#+\s*day\s*:\s*(.*)/i;

	var parse_cron = function(line) {
		var parts = line.split(" ", 6);
		return {
			minute: (parts[0]||-1),
			hour: (parts[1]||-1),
			dayOfMonth: (parts[2]||-1),
			month: (parts[3]||-1),
			dayOfWeek: (parts[4]||-1)
		};
	};
	
	$scope.loadSchedule = function(data) {
		var schedule = {days: []};

		var day = undefined;
		var entry = undefined;

		var prev_day = undefined;
		var explicit_name = false;

		data.split("\n").forEach(function(line, i) {
			if (dayLineRegex.test(line)) {
				line.replace(dayLineRegex, function(w, name) {
					day = {name: name, entries: []};
					prev_day = name;
					explicit_name = true;
					schedule.days.push(day);
				});
				return;
			}

			if (line.startsWith("#")) return; //is a comment
			if (line.trim() == "") return; //ignore empty lines


			var parsed = parse_cron(line);
			var name = dayName.toName(parsed.dayOfWeek-0);
			name = ucfirst(name);

			if (!day || (!explicit_name && prev_day != name)) {
				var newDay = {name: name, entries: []};
				schedule.days.push(newDay);
				day = newDay;
			}
			explicit_name = false;
			prev_day = name;

			var m = moment(parsed.hour+":"+parsed.minute, "hh:mm");

			if (!entry) {
				entry = {startMoment: m};
				return;
			}

			entry.endMoment = m;

			day.entries.push(entry);
			entry = undefined;
		});

		$scope.schedule = schedule;
		return schedule;
	};


	var overlap = function(e1, e2) {
		if (e2.startMoment.isBefore(e1.startMoment)) {
			var t = e1;
			e1 = e2;
			e2 = t;
		}

		return (e1.endMoment.isAfter(e2.startMoment));
	};

	$scope.saveSchedule = function() {
		var cronStrings = [];
		var errors = [];

		$scope.schedule.days.forEach(function(day, dayIndex) {
			// Add comment line to keep the Day Name
			cronStrings.push("#Day: "+day.name);

			day.entries.forEach(function(entry, i) {
				// Validation
				var start = entry.startMoment; //shorthand
				var end = entry.endMoment; //shorthand

				if (!moment.isMoment(start) || !moment.isMoment(end)) {
					errors.push(_("The entry {0}#{1} had unparsed Moments!", day.name, (i+1)));
					return;
				}

				if (!start.isBefore(end)) {
					errors.push(_("Start time is not before the End time, for entry {0}#{1} !", day.name, (i+1)));
					return;
				}

				//## this is a warning, not an actual error
				// if (!start.clone().add(config.entry_duration).isSameOrBefore(end)) return;

				var j;
				if (day.entries.some(function(other, o) {j=o; return i!=j && overlap(entry, other)})) {
					errors.push(_("{0}#{1} overlaps with {0}#{2} !", day.name, (i+1), (j+1)));
				 	return;
				}

				// Add the cron expressions
				var d = dayName.toIndex(day.name);
				if (d < 0) d = dayIndex;

				[start, end].forEach(function(m) {
					var s = m.minutes() + " " + m.hours() + " * * " + d;
					cronStrings.push(s);
				});
			});
		});

		if (errors.length > 0) {
			$scope.schedule.errors = errors;
			return;
		}

		// Return
		var result = cronStrings.join("\n");
		delete $scope.schedule.errors;

		// Save as
		console.log(result);
		var name = prompt(_("Name the schedule"), schedule_name);
		if (!name) return;

		result = "#Schedule: "+name+"\n" + result;

		$http.post("schedule.php?save="+encodeURI(name), result);
	};

}]);