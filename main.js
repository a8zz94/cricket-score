//#region Global Variables
var currentMatchCode = null;
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'  // Local development
  : 'https://cricket-api.kode8.dev/api';  // Clean production URL with HTTPS

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
var bowlerScorecard = [];
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
	$("#run_RO").on("click", function (event) {
		play_ball("RO", 0);
	});
	updateScorecard();
	createNewMatch();
	});

async function play_ball(run, score = 1) {
	if (run == "RO") {
		players[striker].bowlsFaced.push("RO");
		newBatsman();
		updateScorecard();
		return;
	}
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
			 //Wide bowls counter
			 let newBowlerName;

			 try {
			   // Get the bowler name
			   const selectedBowler = await showBowlerModalAsync();
			   newBowlerName = selectedBowler || 'Bowler ' + over_no;
			 } catch (error) {
			   console.error("Error selecting bowler:", error);
			   // Default name if error occurs
			   newBowlerName = 'Bowler ' + over_no;
			 }
			 
			 // Always create the new over with whatever name we have
			 scoreboard[over_no] = [
			   runs = [[0]],
			   extras = 0,
			   newBowlerName
			 ];
			swapBatsmen();
		}
	}
	update_score();
	if (currentMatchCode) {
    await saveMatchState();
  }
}

//#endregion

//#region Scoring Logics 
function update_score() {
  let wickets = 0;

  // console.log(wickets);
  runs = sumScores(allDeliveries.map((d) => d.run));
  wickets = allDeliveries.filter((d) => d.run == "W").length;
  updateTarget();
  updateHtml("#run", runs);
  updateHtml("#wickets", wickets);
  updateBatsmenDisplay();
  updateBowlerDisplay();
  updateScorecard();
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
	  updateScorecard();
	}
  }

function editBowlerName() {
	const newName = prompt("Enter bowler name:", scoreboard[over_no][2]);
	if (newName !== null && newName.trim() !== "") {
	  scoreboard[over_no][2] = newName.trim();
	  updateBowlerDisplay();
	  updateScorecard();
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
	  let playerBalls = player.bowlsFaced.filter(x => x !== "RO").length;
	  let isOut = player.bowlsFaced.includes("W");
	  let isRetired = player.bowlsFaced.includes("RO");
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
			${isRetired ? '<img src="/icons/retired.png" alt="(out)" class="bat-icon">' : ''}
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
	updateHtml("#batting-scorecard",scorecardHtml);
	
	bowlingScorecard();
  }

  function bowlingScorecard() {
	let scoreboardHtml = '';
	bowlerScorecard = restructureByBowler(scoreboard)
	let totalOvers = 0;
	let maidensAndRunsAndWickets = [0,0,0];

	for (const bowler in bowlerScorecard) {
		totalOvers = bowlerScorecard[bowler].length;
		let currentOver = bowlerScorecard[bowler][totalOvers - 1];
		let economy = 0;
		if(currentOver.runs.length <= 6) {
			economy = totalOvers - 1;
			economy = economy + (currentOver.runs.length - 1) / 6;
		}else
		 {
			economy = totalOvers;
		}
		console.log(currentOver);	
		maidensAndRunsAndWickets = calculateNumberOfMadiens(bowlerScorecard[bowler]);
		scoreboardHtml += `
		  <tr>
			<td>${bowler}</td>
			<td>${formatOvers(totalOvers, currentOver)}</td>
			<td>${maidensAndRunsAndWickets[0]}</td>
			<td>${maidensAndRunsAndWickets[1]}</td>
			<td>${maidensAndRunsAndWickets[2]}</td>
			<td>${economy === 0 ? '0.00' : (maidensAndRunsAndWickets[1] / economy).toFixed(2)}</td>
		</tr>
		`;
	}

	updateHtml("#bowling-scorecard", scoreboardHtml);
  }
  
  function formatOvers(totalOvers, currentOver) {
    let overs = totalOvers - 1;
    let balls = currentOver.runs.length - 1;

    if (balls === 6) {
        overs += 1;
        balls = 0;
    }

    return `${overs}.${balls}`;
}

  function calculateNumberOfMadiens(overs){
	let totalRunsForBowler = 0;
	let numberOfMaidens = 0;
	let numberOfWickets = 0;
	if(overs.length <= 1 && overs[0].runs.length < 6) {
		let firstOver = overs[0];
		let runs = sumScores(firstOver.runs);
		totalRunsForBowler += runs + firstOver.extras;
		numberOfWickets += firstOver.runs.filter(item => item === 'W').length;
	}
	else
	{
		overs.forEach(over => {
			let runs = sumScores(over.runs);
			if (over.runs.length >=6 && runs + over.extras == 0) {
				numberOfMaidens++;
			}
			totalRunsForBowler += runs + over.extras;
			numberOfWickets += over.runs.filter(item => item === 'W').length;
		});
	}
	
	return [numberOfMaidens, totalRunsForBowler, numberOfWickets];
  }

  function restructureByBowler(scoreboard) {
	const bowlers = {};
  
	let bowlerName = '';
	// Start from index 1 to skip first team innings
	for (let i = 1; i < scoreboard.length; i++) {
		bowlerName = scoreboard[i][2];
		if (!bowlers[bowlerName]) {
		  bowlers[bowlerName] = [];
		}
		bowlers[bowlerName].push({
		  runs: scoreboard[i][0],
		  extras: scoreboard[i][1]
		});
	}
	
	return bowlers;
  }

//#endregion  

//#region UI Modification
function showBowlerModalAsync() {
  return new Promise((resolve) => {
    // Build the modal content
    let modalContent = `
      <div class="modal-body">
        <h5>Select a bowler</h5>
        <div class="list-group mb-3">`;
    
    // Get existing bowlers
    const bowlers = restructureByBowler(scoreboard);
    for(const bowler in bowlers) {
      modalContent += `<button type="button" class="list-group-item list-group-item-action" 
                        onclick="selectBowler('${bowler}')">${bowler}</button>`;
    }
    
    // Add input for new bowler
    modalContent += `
        </div>
        <div class="input-group mb-3">
          <input type="text" class="form-control" id="new-bowler-input" placeholder="Input new bowler">
          <button class="btn btn-primary" type="button" onclick="selectNewBowler()">Select</button>
        </div>
      </div>
    `;
    
    // Set the modal content
    $("#changeBowlerContainer").html(modalContent);
    
    // Define global functions to handle selections
    window.selectedBowlerName = null;
    window.bowlerModalResolved = false;
    
    window.selectBowler = function(name) {
      window.selectedBowlerName = name;
      window.bowlerModalResolved = true;
      $("#changeBowlerModal").modal('hide');
    };
    
    window.selectNewBowler = function() {
      const newName = $("#new-bowler-input").val().trim();
      if (newName) {
        window.selectedBowlerName = newName;
        window.bowlerModalResolved = true;
        $("#changeBowlerModal").modal('hide');
      }
    };
    
    // Set up input field to respond to Enter key
    document.getElementById("new-bowler-input").addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        window.selectNewBowler();
      }
    });
    
    // Show the modal
    $("#changeBowlerModal").modal('show');
    
    // Handle modal hidden event - this fires no matter how the modal is closed
    $("#changeBowlerModal").on('hidden.bs.modal', function () {
      // Always resolve the promise, regardless of how modal was closed
      if (window.bowlerModalResolved && window.selectedBowlerName) {
        resolve(window.selectedBowlerName);
      } else {
        // Default if modal was closed without selection (X button, escape, clicking outside, etc.)
        resolve("Bowler " + over_no);
      }
      
      // Clean up global functions and variables
      window.selectBowler = undefined;
      window.selectNewBowler = undefined;
      window.selectedBowlerName = undefined;
      window.bowlerModalResolved = undefined;
      
      // Remove the event handler to prevent memory leaks
      $("#changeBowlerModal").off('hidden.bs.modal');
    });
  });
}

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
	var numberOfBalls = players[striker].bowlsFaced.length;
	
	var nonStrikerScore = sumScores(players[nonStriker].bowlsFaced);
	var nonStrikerNumberOfBalls = players[nonStriker].bowlsFaced.length;
	
	// Update striker display using updateHtml (this will send MQTT messages)
	updateHtml("#striker-name", players[striker].name);
	updateHtml("#striker-runs", strikerScore);
	updateHtml("#striker-balls", numberOfBalls);
	
	// Update non-striker display using updateHtml (this will send MQTT messages)
	updateHtml("#nonstriker-name", players[nonStriker].name);
	updateHtml("#nonstriker-runs", nonStrikerScore);
	updateHtml("#nonstriker-balls", nonStrikerNumberOfBalls);
  }

  function updateBowlerDisplay() {
	let currentBowlerScorecard = restructureByBowler(scoreboard)[scoreboard[over_no][2]];
	let maidensAndRunsAndWickets = calculateNumberOfMadiens(currentBowlerScorecard);
	updateHtml("#bowler-name", scoreboard[over_no][2]);
	updateHtml("#bowler-runs", maidensAndRunsAndWickets[1]);
	updateHtml("#bowler-wickets", maidensAndRunsAndWickets[2]);
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
	updateBowlerDisplay();
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
		"#striker-name": $("#striker-name").html(),
		"#striker-runs": $("#striker-runs").html(),
		"#striker-balls": $("#striker-balls").html(),
		"#nonstriker-name": $("#nonstriker-name").html(),
		"#nonstriker-runs": $("#nonstriker-runs").html(),
		"#nonstriker-balls": $("#nonstriker-balls").html(),
		"#bowling-scorecard": $("#bowling-scorecard").html(),
		"#batting-scorecard": $("#batting-scorecard").html(),
		"#bowler-wickets": $("#bowler-wickets").html(),
		"#bowler-runs": $("#bowler-runs").html(),
	};
	publishMessage(
		JSON.stringify({
			init: vars,
			isTargetMode: isTargetMode,
		})
	);
}

//#endregion

async function createNewMatch() {
  try {
    const response = await fetch(`${API_BASE}/match/create`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    });
    
    const result = await response.json();
    
    if (result.success) {
      currentMatchCode = result.matchCode;
         
      // Update UI to show match code
      updateMatchCodeDisplay();
      
      return currentMatchCode;
    } 
  } catch (error) {
	updateMatchCodeDisplay();
    console.error('Failed to create match:', error);
  }
}

async function saveMatchState() {
  if (!currentMatchCode) {
    return;
  }
  
  const matchData = {
    scoreboard, players, allDeliveries, 
    ball_no, over_no, runs, striker, nonStriker, nextBatsman,
    isNoBall, isTargetMode, targetRuns, targetOvers,
    bowlerScorecard
  };
  
  try {
    const response = await fetch(`${API_BASE}/match/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ matchCode: currentMatchCode, matchData })
    });
    
    const result = await response.json();
    if (result.success) {
      updateMatchCodeDisplay(); // Update last saved time
    }
  } catch (error) {
    console.error('Save failed:', error);
  }
}

async function loadMatchByCode(matchCode = null) {
  if (!matchCode) {
    matchCode = prompt('Enter match code:');
    if (!matchCode) return;
  }
  
  matchCode = matchCode.toUpperCase().trim();
  
  if (allDeliveries.length > 0) {
    if (!confirm('Loading will overwrite current match. Continue?')) {
      return;
    }
  }
  
  try {
    const response = await fetch(`${API_BASE}/match/load/${matchCode}`);
    const result = await response.json();
    
    if (result.success) {
      const data = result.data;
      currentMatchCode = matchCode;
      
      // Restore all your variables
      scoreboard = data.scoreboard || [[], [runs = [[0]], extras = 0, bowler = 'Bowler 1']];
      players = data.players || Array(11).fill().map((_, i) => ({ name: "Player " + (i+1), bowlsFaced: [] }));
      allDeliveries = data.allDeliveries || [];
      ball_no = data.ball_no || 1;
      over_no = data.over_no || 1;
      runs = data.runs || 0;
      striker = data.striker || 0;
      nonStriker = data.nonStriker || 1;
      nextBatsman = data.nextBatsman || 2;
      isNoBall = data.isNoBall || false;
      isTargetMode = data.isTargetMode || false;
      targetRuns = data.targetRuns || -1;
      targetOvers = data.targetOvers || -1;
      bowlerScorecard = data.bowlerScorecard || [];
      
      // Clear any no-ball state
      noBall(false);
      
      // Update all displays
      update_score();
      update_runboard();
      updateBatsmenDisplay();
      updateBowlerDisplay();
      updateScorecard();
      
      // Handle target mode
      if (isTargetMode) {
        setTarget(true);
      }
      
      updateMatchCodeDisplay();
      
    } else {
    }
  } catch (error) {
    console.error('Load failed:', error);
  }
}

function updateMatchCodeDisplay() {
  if (currentMatchCode) {
    const displayText = `Match Code: ${currentMatchCode}`;
    // You can add this to any part of your UI
    updateHtml("#match-code-display", displayText);
  }
  else {
    const displayText = `Failed to generate match code`;
    // You can add this to any part of your UI
    updateHtml("#match-code-display", displayText);
  }
}
async function listMatches() {
  try {
    const response = await fetch(`${API_BASE}/matches`);
    const result = await response.json();
    
    if (result.success) {
      console.log(result.matches);
      
      // Build HTML for the matches list
      let matchesHtml = `
	  	<button class="btn btn-outline-secondary btn-sm" onclick="loadRecentMatches()">
                  Show Recent Matches
                </button>`;
      
      if (result.matches.length === 0) {
        matchesHtml = '<p class="text-muted">No matches found</p>';
      } else {
        result.matches.forEach(match => {
          const date = new Date(match.lastUpdated).toLocaleDateString();
          const time = new Date(match.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          
          matchesHtml += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
              <button class="btn btn-outline-primary btn-sm col-4" onclick="loadMatchByCode('${match.matchCode}')" data-dismiss="modal">
                ${match.matchCode}
              </button>
              <small class="text-muted col-4 ms-2">${date} ${time}</small>
			  <button class="btn btn-outline-danger btn-sm col-4" onclick="deleteMatch('${match.matchCode}')" data-dismiss="modal">Delete</button>
            </div>
          `;
        });
      }
      
      updateHtml("#recent-matches-list", matchesHtml);
      return result.matches;
    }
  } catch (error) {
    console.error('Failed to list matches:', error);
    updateHtml("#recent-matches-list", '<p class="text-danger">Failed to load matches</p>');
  }
  return [];
}

async function loadRecentMatches() {
  updateHtml("#recent-matches-list", '<p class="text-muted">Loading...</p>');
  await listMatches();
}

async function deleteMatch(matchCode) {
  if (!matchCode) {
    matchCode = prompt('Enter match code to delete:');
    if (!matchCode) return;
  }
  
  matchCode = matchCode.toUpperCase().trim();
  
  if (!confirm(`Are you sure you want to delete match ${matchCode}? This cannot be undone.`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/match/${matchCode}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert(`Match ${matchCode} deleted successfully!`);
      
      // If we deleted the current match, clear the UI
      if (currentMatchCode === matchCode) {
        currentMatchCode = null;
        resetGameState();
        updateMatchCodeDisplay();
      }
      
      // Refresh matches list if displayed
      if (document.getElementById('recent-matches-list').innerHTML.includes('btn-outline-primary')) {
        await listMatches();
      }
    } else {
      alert('Delete failed: ' + result.error);
    }
  } catch (error) {
    console.error('Delete failed:', error);
    alert('Delete failed - check if backend is running');
  }
}