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

	// header messages
	msgs["Timetable to Cron"] = "Графици за звънене";
	
	// list-view messages
	msgs["List of saved schedules"] = "Списък на запазените графици";
	msgs["Active"] = "Активен";
	msgs["Activate"] = "Активирай";
	msgs["No saved schedules"] = "Няма запазени графици";
	msgs["Create a schedule"] = "Създай график";

	// single-view messages
	msgs["Schedules"] = "Графици";
	msgs["active"] = "активен";
	msgs["Schedule"] = "График";
	msgs["+"] = "+";
	msgs["remove tab"] = "изтрий деня";
	msgs["x"] = "x";
	msgs["Add entry"] = "Добави ред";
	msgs["Save"] = "Запази";
	msgs["Show danger"] = "Покажи опасните";
	msgs["Hide danger"] = "Скрий опасните";

	//Days
	msgs["monday"] = "понеделник";
	msgs["tuesday"] = "вторник";
	msgs["wednesday"] = "сряда";
	msgs["thursday"] = "четвъртък";
	msgs["friday"] = "петък";
	msgs["saturday"] = "събота";
	msgs["sunday"] = "неделя";

	//Console Error messages
	msgs["Failed to fetch the list of saved schedules."] = "Грешка при взимането на списъка със запазени графици.";
	msgs["Failed to load the schedule."] = "Грешка при зареждането на графика.";

	//Prompts
	msgs["Enter the name of the day"] = "Въведете името на деня";
	msgs["Name the schedule"] = "Именувайте графика";

	//Formatted messages
	msgs["The entry {0}#{1} had unparsed Moments!"] = "Редът {0}#{1} има е повреден.";
	msgs["Start time is not before the End time, for entry {0}#{1} !"] = "Началното време не е преди крайното време за {0}#{1} !";
	msgs["{0}#{1} overlaps with {0}#{2} !"] = "{0}#{1} се застъпва със {0}#{2} !";


	var _ = function(m) { return msgs[m]||m; };
	return function(str) {
		if (arguments.length > 1) {
			var args = Array.prototype.slice.apply(arguments, [1]);
			return String.prototype.format.apply(_(str), args);
		}

		return _(str);
	};
}());