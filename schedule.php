<?php

define("SCHEDULES_DIR", "schedules/", 1);
define("CHANGES_FILE", "changes_to_active_schedule", 1);
define("ACTIVE_FILE_START", "@", 1);
define("ACTIVE_FILE_START_PATTERN", "/\s*\@\s*/", 1);
define("NAME_LINE_PATTERN", "/\s*+#\s*+Schedule\s*+:\s*+([^\n]*+)\n?/i", 1);



function sanitize($input) {
	return mb_ereg_replace("/[^\pL\-_ ]/", "", $input);
}


function get_schedule_name($filename) {
	$handle = fopen($filename, "r");
	if (!$handle) {
		http_response_code(500);
		echo "Error opening the file '$filename'.";
		return null;
	}

    while (($line = fgets($handle)) !== false) {
        $matches;
        if (preg_match(NAME_LINE_PATTERN, $line, $matches))
        	return $matches[1];
    }

    return null;
}

function get_schedules() {
	$files = glob(SCHEDULES_DIR."*");

	$schedules = array();
	foreach ($files as $i=>$filename) {
		$name = get_schedule_name($filename);
		$schedules[] = array("name"=>$name, "file"=>$filename, "active"=>($i==0));
	}

	return $schedules;
}

function find_schedule($name, &$schedules = null) {
	if (is_null($schedules))
		$schedules = get_schedules();

	foreach ($schedules as $i => $schedule) {
		if ($schedule["name"] == $name)
			return $schedule;
	}
	return false;
}

function get_active_schedule(&$schedules = null) {
	if (is_null($schedules))
		$schedules = get_schedules();

	if (!isset($schedules[0]))
		return false;

	return $schedules[0];
}


//active
if (isset($_REQUEST["active"])) {
	$active = get_active_schedule();

	if (!$active) exit;

	$name = $active["name"];
	$_REQUEST["name"] = $name;
}

//specific schedule
if (isset($_REQUEST["name"])) {
	$name = sanitize($_REQUEST["name"]);
	$schedule = find_schedule($name);

	if (!$schedule) {
		http_response_code(404);
		exit;
	}

	header("X-Schedule-Name: ".$schedule["name"]);
	header("X-Schedule-Active: ".$schedule["active"]);
	echo file_get_contents($schedule["file"]);

	exit;
}


//list
if (isset($_REQUEST["list"])) {
	$names = array_map(function($s) { return $s["name"]; }, get_schedules());
	echo json_encode($names);
	exit;
}


function push_schedule_changes($contents) {
	$contents = preg_replace(NAME_LINE_PATTERN, "", $contents);
	file_put_contents(CHANGES_FILE.".lck", "locked");
	file_put_contents(CHANGES_FILE, $contents);
	unlink(CHANGES_FILE.".lck");
}

//save
if (isset($_REQUEST["save"])) {
	$name = sanitize($_REQUEST["save"]);

	$schedules;
	$schedule = find_schedule($name, $schedules);

	if ($schedule===false) {
		$c = count($schedules);
		$a = ($c==0);
		$schedule = array("file"=>SCHEDULES_DIR.($a? ACTIVE_FILE_START : "")."schedule".$c, "active"=>$a);
	}

	$contents = file_get_contents('php://input');
	file_put_contents($schedule["file"], $contents);

	if ($schedule["active"])
		push_schedule_changes($contents);

	exit;
}


//activate a schedule
if (isset($_REQUEST["activate"])) {
	$name = sanitize($_REQUEST["activate"]);

	$schedules;
	$schedule = find_schedule($name, $schedules);

	if ($schedule === false) {
		http_response_code(404);
		exit;
	}

	$active = get_active_schedule($schedules);

	$b = basename($schedule["file"]);
	$newName = str_replace($b, ACTIVE_FILE_START.$b, $schedule["file"]);
	rename($schedule["file"], $newName);
	rename($active["file"], preg_replace(ACTIVE_FILE_START_PATTERN, "", $active["file"]));

	push_schedule_changes(file_get_contents($newName));

	exit;
}
?>