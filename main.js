//#region Global Variables
var scoreboard = [
	[],
	[
		runs = [[0]],
		extras = 0,
		bowler = 'Bowler 1'
	]
]//scoreboard[<over_no>][0] counts wide runs
var ball_no = 1; // Ball number will start from 1
var over_no = 1; // Over number will start from 1
var runs = 0;
var edited = [];
var isNoBall = false;
var isTargetMode = false;
var targetRuns = -1; // total runs scored by other team
var targetOvers = -1; //total overs
var isShareMode = false;
var allDeliveries = []; //Run and Striker Index
// Add these variables
var players = Array(11).fill().map((_, i) => ({ 
    name: "Player " + (i+1), 
	bowlsFaced: [] 
}));
var striker = 0; // Index of striker batsman
var nonStriker = 1; // Index of non-striker batsman
var nextBatsman = 2; // Index of next batsman to come in
//#endregion

//#region Application Start

$(document).ready(function () {
	$("#run_dot").on("click", function (event) {
		play_ball("D", 0);
	});
	$("#run_1").on("click", function (event) {
		play_ball(1);
	});
	$("#run_2").on("click", function (event) {
		play_ball(2);
	});
	$("#run_3").on("click", function (event) {
		play_ball(3);
	});
	$("#run_wide").on("click", function (event) {
		play_ball("+", 0);
	});
	$("#run_no_ball").on("click", function (event) {
		play_ball("NB", 0);
	});
	$("#run_4").on("click", function (event) {
		play_ball(4);
	});
	$("#run_6").on("click", function (event) {
		play_ball(6);
	});
	$("#run_W").on("click", function (event) {
		play_ball("W", 0);
	});
	$("#scoreboard-btn").on("click", function (event) {
		updateScorecard()
	});
});

function play_ball(run, score = 1) {
	recordDelivery(run, striker);
	if (run !== "+" && run !== "NB") {
		// For normal deliveries (not extras)
		players[striker].bowlsFaced.push(run);
		if (run !== "W") {
		  if (typeof run === 'number' && run % 2 === 1) {
			swapBatsmen();
		  }
		} else {
		  newBatsman();
		}
	  }
	if (run == "+") {
		//Wide ball
		runs++;
		scoreboard[over_no][1] += 1;
		update_score();
		return;
	}
	if (run == "NB") {
		// isNoBall = true;
		noBall(true);
		//No ball
		runs++;
		scoreboard[over_no][1] += 1;
		update_score();
		return;
	}
	if (score == 1) {
		runs += run;
	}
	// console.log("over_no=", over_no, "| ball_no=", ball_no," |Runs=",runs);

	if (isNoBall) {
		scoreboard[over_no][1] += run == "D" ? 0 : run;
		// isNoBall = false;
		noBall(false);
	} else {
		//try with ball_no
		scoreboard[over_no][0][ball_no] = run;
		//scoreboard[over_no][0].push(run);
		// console.log(scoreboard[over_no]);
		// console.log(scoreboard);
		update_runboard();
		ball_no++;
		if (ball_no >= 7) {
			ball_no = 1;
			over_no++;
			scoreboard[over_no] =[
				runs = [[0]],
				extras = 0,
				bowler = 'Bowler ' + over_no
			]; //Wide bowls counter
			swapBatsmen();
		}
	}
	update_score();
}

//#endregion

//#region Scoring Logics 
function update_score() {
  let score = 0;
  let wickets = 0;

  // console.log(wickets);
  runs = sumScores(allDeliveries.map((d) => d.run));
  updateTarget();
  updateHtml("#run", runs);
  updateHtml("#wickets", wickets);
  updateBatsmenDisplay();
}

function recordDelivery(run, strikerIdx) {
  allDeliveries.push({
    run: run,
    striker: strikerIdx,
  });
}

function update_runboard() {
  // Updates the runboard when the function is called
  for (i = 1; i < 7; i++) {
    let score_und = (_score_und) => (_score_und == undefined ? "" : _score_und);
    updateHtml(
      "#ball_no_" + i.toString(),
      score_und(scoreboard[over_no][0][i])
    );
  }
  if (ball_no != 1) {
    $("#ball_no_" + ball_no.toString()).removeClass("btn-light");
    $("#ball_no_" + ball_no.toString()).addClass("btn-primary");
  } else {
    for (i = 2; i <= 6; i++) {
      $("#ball_no_" + i.toString()).removeClass("btn-primary");
      $("#ball_no_" + i.toString()).addClass("btn-light");
    }
  }
  updateHtml(
    "#over-ball",
    (ball_no == 6 ? over_no : over_no - 1).toString() +
      "." +
      (ball_no == 6 ? 0 : ball_no).toString()
  );
}

function sumScores(scoreArray) {
  return scoreArray.reduce((total, value) => {
    // Handle numbers directly
    if (typeof value === "number") {
      return total + value;
    }
    // Handle special string cases
    switch (value) {
      case "NB": // No ball
        return total + 1;
      case "+": // Wide
        return total + 1;
      case "D": // Dot ball
      case "W": // Wicket
        return total + 0;
      default: // Any other string
        return total + 0;
    }
  }, 0);
}

// Function to edit player name
function editPlayerName(playerIndex) {
	const newName = prompt("Enter player name:", players[playerIndex].name);
	if (newName !== null && newName.trim() !== "") {
	  players[playerIndex].name = newName.trim();
	  updateBatsmenDisplay();
	}
  }
  
  // Function to swap striker and non-striker
  function swapBatsmen() {
	const temp = striker;
	striker = nonStriker;
	nonStriker = temp;
	updateBatsmenDisplay();
  }
  
  // Function to bring in new batsman (after wicket)
  function newBatsman() {
	if (nextBatsman < 11) {
	  striker = nextBatsman;
	  nextBatsman++;
	  updateBatsmenDisplay();
	} else {
	  alert("All out!");
	  // Handle all out scenario
	}
  }

// Function to update the player scorecard
function updateScorecard() {
	let scorecardHtml = '';
	
	// Calculate team totals
	let totalRuns = 0;
	let totalBalls = 0;
	let totalFours = 0;
	let totalSixes = 0;
	
	// Generate rows for each player
	for (let i = 0; i < players.length; i++) {
	  const player = players[i];
	  const isStriker = i === striker;
	  const isNonStriker = i === nonStriker;
	  const hasNotBatted = i >= nextBatsman;
	  let playerSixes = player.bowlsFaced.filter(x => x === 6).length;
	  let playerFours = player.bowlsFaced.filter(x => x === 4).length;
	  let playerRuns = sumScores(player.bowlsFaced);
	  let playerBalls = player.bowlsFaced.length;
	  let isOut = player.bowlsFaced.includes("W");
	  if(hasNotBatted) {
		continue; // Skip players who haven't batted
	  }

	  // Calculate strike rate (runs ÷ balls × 100)
	  const strikeRate = playerBalls > 0 ? 
		(playerRuns / playerBalls * 100).toFixed(2) : 
		"0.00";
	  
	  // Add player row
	  scorecardHtml += `
		<tr>
		  <td>
			<span onclick="editPlayerName(${i})">${player.name}</span> 
			${isStriker ? '<img src="/icons/cricket-bat.png" alt="*" class="bat-icon">' : ''}
			${isOut ? '<img src="/icons/out.png" alt="(out)" class="bat-icon">' : ''}
			${isNonStriker ? '<span class="text-muted">not out</span>' : ''}
		  </td>
		  <td>${hasNotBatted ? '-' : playerRuns}</td>
		  <td>${hasNotBatted ? '-' : playerBalls}</td>
		  <td>${hasNotBatted ? '-' : playerFours}</td>
		  <td>${hasNotBatted ? '-' : playerSixes}</td>
		  <td>${hasNotBatted ? '-' : strikeRate}</td>
		</tr>
	  `;
	  
	  // Add to totals if player has batted
	  if (!hasNotBatted) {
		totalRuns += playerRuns;
		totalBalls += playerBalls;
		totalFours += playerFours;
		totalSixes += playerSixes;
	  }
	}
	
	// Add extras and total rows
	const extras = runs - totalRuns; // Calculate extras
	
	scorecardHtml += `
	  <tr class="table-light">
		<td><strong>Extras</strong></td>
		<td colspan="5"><strong>${extras}</strong> (Wides, No-balls, etc.)</td>
	  </tr>
	  <tr class="table-primary">
		<td><strong>TOTAL</strong></td>
		<td><strong>${runs}</strong></td>
		<td><strong>${totalBalls}</strong></td>
		<td><strong>${totalFours}</strong></td>
		<td><strong>${totalSixes}</strong></td>
		<td><strong>${totalBalls > 0 ? ((runs / totalBalls) * 100).toFixed(2) : "0.00"}</strong></td>
	  </tr>
	`;
	
	// Update the scorecard table
	$('#batting-scorecard').html(scorecardHtml);
  }

//#endregion  

//#region UI Modification
function noBall(is_NoBall) {
	isNoBall = is_NoBall;
	var run_no_ball = $("#run_no_ball");
	if (is_NoBall) {
		$("#no-ball-warning").show();
		$("#run_wide").prop("disabled", true);
		$("#run_no_ball").prop("disabled", true);
		$("#run_W").prop("disabled", true);

		run_no_ball.css("backgroundColor", "#0D6EFD");
		run_no_ball.css("color", "#ffffff");
	} else {
		$("#no-ball-warning").hide();
		$("#run_wide").prop("disabled", false);
		$("#run_no_ball").prop("disabled", false);
		$("#run_W").prop("disabled", false);

		run_no_ball.css("backgroundColor", "#e5f3ff");
		run_no_ball.css("color", "#0D6EFD");
	}
}

function setTarget(isTargetModeOn = true) {
	isTargetMode = isTargetModeOn;
	if (!isTargetModeOn) {
		$("#targetBoard").hide();
		$("#targetModeButton").show();
	} else {
		targetRuns = parseInt($("#targetRuns").val());
		targetOvers = parseInt($("#targetOvers").val());
		updateTarget();
		$("#targetBoard").show(2500);
		$("#targetModeButton").hide();
	}
	publishMessage(
		JSON.stringify({
			isTargetMode: isTargetMode,
		})
	);
}

function updateTarget() {
	if (!isTargetMode) return;
	updateHtml("#targetRunsRequired", targetRuns - runs);
	let ballsLeft = targetOvers * 6 - ((over_no - 1) * 6 + ball_no - 1);
	updateHtml("#targetOversLeft", ballsLeft);

	let closeButton =
		'';
	if (ballsLeft == 0) {
		if (targetRuns < runs) {
			updateHtml(
				"#targetBody",
				"Hurray! The batting team has Won!!" + closeButton
			);
		} else if (targetRuns - 1 == runs) {
			updateHtml("#targetBody", "Match Over! It's a tie." + closeButton);
		} else {
			updateHtml(
				"#targetBody",
				"Hurray! The bowling team has Won!!" + closeButton
			);
		}
		$("#targetModeButton").show();
	}
	if (targetRuns <= runs) {
		updateHtml(
			"#targetBody",
			"Hurray! The batting team has Won!!" + closeButton
		);
		$("#targetModeButton").show();
	}
}

function updateHtml(eleId, newHtml) {
	/// eleId is in the form of "#overs"
	let isSame = $(eleId).html() == newHtml;
	$(eleId).html(newHtml);

	if (isShareMode && !isSame)
		publishMessage(
			JSON.stringify({
				update: { eleId: eleId, newHtml: newHtml },
			})
		);
}

  // Function to update batsmen display
  function updateBatsmenDisplay() {
	var strikerScore = sumScores(players[striker].bowlsFaced);
	var numberOfBalls = players[striker].bowlsFaced.length
	// Update striker display
	$("#striker-name").text(players[striker].name);
	$("#striker-runs").text(strikerScore);
	$("#striker-balls").text(numberOfBalls);
	
	// Update non-striker display
	var nonStrikerScore = sumScores(players[nonStriker].bowlsFaced);
	var nonStrikerNumberOfBalls = players[nonStriker].bowlsFaced.length
	$("#nonstriker-name").text(players[nonStriker].name);
	$("#nonstriker-runs").text(nonStrikerScore);
	$("#nonstriker-balls").text(nonStrikerNumberOfBalls);
  }
  
//#endregion

//#region Score Modification

function back_button() {
	if(allDeliveries.length == 0 ) return;
  
	var last = allDeliveries.pop();
  
	if (last.run == "+") {
	  scoreboard[over_no][1] -= 1;
	} else {
	  ball_no--;
	  if (ball_no == 0) {
		ball_no = 6;
		over_no--;
	  }
	  if (last.run == "W") {
		players[last.striker].bowlsFaced.pop();
		striker = last.striker;
		nextBatsman--;
	  } else if (last == "D") {
		players[striker].bowlsFaced.pop();
	  } else if (last == 1 || last == 3 || last == 5) {
		players[nonStriker].bowlsFaced.pop();
		swapBatsmen();
	  } else {
		players[striker].bowlsFaced.pop();
	  }
	  scoreboard[over_no][0][ball_no] = undefined;
	}
	update_score();
	update_runboard();
	updateBatsmenDisplay();
	updateHtml(
	  "#over-ball",
	  (over_no - 1).toString() + "." + (ball_no - 1).toString()
	);
  }
  
  function change_score() {
	  let over = parseInt($("#change_over").val());
	  let ball = parseInt($("#change_ball").val());
	  let run = parseInt($("#change_run").val());
	  edited.push([over, ball, scoreboard[over][0][ball], run]);
	  scoreboard[over][0][ball] = run;
	  update_score();
	  updateHtml("#run", runs);
	  let edited_scores = "Edited scores:<br>";
	  for (i = 0; i < edited.length; i++) {
		  edited_scores +=
			  "(" +
			  edited[i][0].toString() +
			  "." +
			  edited[i][1].toString() +
			  ") = " +
			  edited[i][2].toString() +
			  " -> " +
			  edited[i][3].toString();
		  edited_scores += "<br>";
	  }
	  // }
	  updateHtml("#edited-scores", edited_scores);
  }

//#endregion

//#region Share Connection Stuff

function shareModeStart() {
	isShareMode = true;
	startConnect();
}

function sendInitVariables() {
	let vars = {
		"#ball_no_1": $("#ball_no_1").html(),
		"#ball_no_2": $("#ball_no_2").html(),
		"#ball_no_3": $("#ball_no_3").html(),
		"#ball_no_4": $("#ball_no_4").html(),
		"#ball_no_5": $("#ball_no_5").html(),
		"#ball_no_6": $("#ball_no_6").html(),
		"#over-ball": $("#over-ball").html(),
		"#run": $("#run").html(),
		"#edited-scores": $("#edited-scores").html(),
		"#scoreboard": $("#scoreboard").html(),
		"#wickets": $("#wickets").html(),
		"#targetRunsRequired": $("#targetRunsRequired").html(),
		"#targetBody": $("#targetBody").html(),
	};
	publishMessage(
		JSON.stringify({
			init: vars,
			isTargetMode: isTargetMode,
		})
	);
}

//#endregion