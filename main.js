//#region Global Variables
var currentMatchCode = null;
const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001/api" // Local development
    : "https://cricket-api.kode8.dev/api"; // Clean production URL with HTTPS

var scoreboard = [[], [(runs = [[0]]), (extras = 0), (bowler = "Bowler 1")]]; //scoreboard[<over_no>][0] counts wide runs
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
var players = Array(11)
  .fill()
  .map((_, i) => ({
    name: "Player " + (i + 1),
    bowlsFaced: [],
    index: i,
    outOver: null,
  }));
var striker = 0; // Index of striker batsman
var nonStriker = 1; // Index of non-striker batsman
var nextBatsman = 2; // Index of next batsman to come in
var bowlerScorecard = [];
var isWicketMode = false;
var isRunOutMode = false;
var selectedRunOutRuns = 0;

var allAvailablePlayers = [
  "Abdullah",
  "Al Amin",
  "Eousuf",
  "Fahim",
  "Farhan",
  "Hafizur",
  "Humayun",
  "Imran",
  "Iqbal",
  "Jakaria",
  "Lukman",
  "Mahbub",
  "Mamun",
  "Munna",
  "Mubashshir",
  "Shazi",
  "Rayhan",
  "Raju",
  "Ridwan",
  "Shakib",
  "Sodrul",
  "Tahsin",
]; // List of all bowlers available in the match
//#endregion

//#region Application Start

$(document).ready(function () {
  $("#run_dot").on("click", function (event) {
    play_ball("D", 0);
  });
  $("#run_1").on("click", function (event) {
    if (isRunOutMode) {
      selectedRunOutRuns = 0;
      showRunOutPlayerSelection();
    } else if (isWicketMode) {
      play_ball("W", 0); // Bowled
      exitWicketMode();
    } else {
      play_ball(1);
    }
  });

  $("#run_2").on("click", function (event) {
    if (isRunOutMode) {
      selectedRunOutRuns = 1;
      showRunOutPlayerSelection();
    } else if (isWicketMode) {
      play_ball("W", 0); // Caught
      exitWicketMode();
    } else {
      play_ball(2);
    }
  });

  $("#run_3").on("click", function (event) {
    if (isRunOutMode) {
      selectedRunOutRuns = 2;
      showRunOutPlayerSelection();
    } else if (isWicketMode) {
      play_ball("W", 0); // LBW
      exitWicketMode();
    } else {
      play_ball(3);
    }
  });
  $("#run_wide").on("click", function (event) {
    play_ball("+", 0);
  });
  $("#run_no_ball").on("click", function (event) {
    play_ball("NB", 0);
  });

  $("#run_4").on("click", function (event) {
    if (isRunOutMode) {
      // TODO: Add player selection step here
      play_ball("W", 0); // For now, still just records wicket
      exitWicketMode();
    } else if (isWicketMode) {
      enterRunOutMode(); // Go to run selection instead of immediate wicket
    } else {
      play_ball(4);
    }
  });

  $("#run_6").on("click", function (event) {
    if (isRunOutMode) {
      selectedRunOutRuns = 4; // 4+ runs, we'll use 4 as default
      showRunOutPlayerSelection();
    } else if (isWicketMode) {
      play_ball("W", 0); // Stumped
      exitWicketMode();
    } else {
      play_ball(6);
    }
  });

  $("#run_W").on("click", function (event) {
    if (isRunOutMode) {
      exitRunOutMode(); // Go back to wicket selection
    } else if (!isWicketMode) {
      enterWicketMode();
    } else {
      exitWicketMode();
    }
  });

  $("#run_RO").on("click", function (event) {
    play_ball("RO", 0);
  });
  updateScorecard();
  createNewMatch();
});

async function play_ball(run, score = 1) {
  if (run == "RO") {
    retireBatsman();
    updateScorecard();
    return;
  }
  if (run == "NB") {
    noBall(true);
    return;
  }
  if (typeof run === "string" && run.includes("W+")) {
    const parts = run.split("+");
    const completedRuns = parseInt(parts[1], 10);
    const outPlayerIndex = parseInt(parts[2], 10);

    if (striker === outPlayerIndex) {
      players[striker].bowlsFaced.push("R_O+" + completedRuns);
      //Keeping for now until we figure out how to decide who was the fielder
      players[striker].outOver = "runout";
      // setNextBatsman(); // Bring in new batsman
      newBatsman();
    } else {
      players[striker].bowlsFaced.push(completedRuns);
      players[outPlayerIndex].outOver = "runout";
      // setNextBatsman(true);
      newBatsman(true);
    }

    // Reset run out mode
    runs += completedRuns;
    run = "W+" + completedRuns;
    isRunOutMode = false;
    isWicketMode = false;
  } else if (run !== "+" && run !== "NB") {
    // For normal deliveries (not extras)
    players[striker].bowlsFaced.push(run);
    if (run !== "W") {
      if (typeof run === "number" && run % 2 === 1) {
        swapBatsmen();
      }
    } else {
      players[striker].outOver = over_no; // Record who got the batsman out
      newBatsman();
    }
  }
  recordDelivery(run, striker);
  if (run == "+") {
    //Wide ball
    runs++;
    scoreboard[over_no][1] += 1;
    update_score();
    return;
  }
  if (score == 1) {
    runs += run;
  }
  if (isNoBall) {
    let totalRun = run == "D" ? 1 : run + 1;
    scoreboard[over_no][1] += totalRun;
    runs += totalRun;
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
        const selectedBowler = await showPlayerModalAsync("bowler");
        newBowlerName = selectedBowler || "Bowler " + over_no;
      } catch (error) {
        console.error("Error selecting bowler:", error);
        // Default name if error occurs
        newBowlerName = "Bowler " + over_no;
      }

      // Always create the new over with whatever name we have
      scoreboard[over_no] = [(runs = [[0]]), (extras = 0), newBowlerName];
      swapBatsmen();
      updateOverBalls();
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

  runs = sumScores(allDeliveries.map((d) => d.run));
  wickets = allDeliveries.filter(
    (d) => typeof d.run === "string" && d.run.startsWith("W")
  ).length;
  updateTarget();
  updateHtml("#run", runs);
  updateHtml("#wickets", wickets);
  updateBatsmenDisplay();
  updateBowlerDisplay();
  updateScorecard();

  // Calculate partnership - ADD THIS LINE
  calculatePartnership();
}

function recordDelivery(run, strikerIdx) {
  if (isNoBall) {
    if (run === "D") {
      run = 1;
    } else if (typeof run === "number") {
      run++;
    }
  }
  allDeliveries.push({
    run: run,
    striker: strikerIdx,
    isNoBall: isNoBall,
  });
}

function update_runboard() {
  // Updates the runboard when the function is called
  updateOverBalls();
  updateOverDisplay();
}

function updateOverBalls() {
  // Update the content of each ball
  for (i = 1; i < 7; i++) {
    let score_und = (_score_und) => (_score_und == undefined ? "" : _score_und);
    updateHtml(
      "#ball_no_" + i.toString(),
      score_und(scoreboard[over_no][0][i])
    );
  }

  // Update the styling (current ball vs others)
  if (ball_no != 1) {
    $("#ball_no_" + ball_no.toString()).removeClass("btn-light");
    $("#ball_no_" + ball_no.toString()).addClass("btn-primary");
  } else {
    for (i = 2; i <= 6; i++) {
      $("#ball_no_" + i.toString()).removeClass("btn-primary");
      $("#ball_no_" + i.toString()).addClass("btn-light");
    }
  }
}

function updateOverDisplay() {
  // Update the over count display (e.g., "18.4 overs")
  const displayOver = (ball_no == 6 ? over_no : over_no - 1).toString();
  const displayBall = (ball_no == 6 ? 0 : ball_no).toString();

  updateHtml("#over-ball", displayOver + "." + displayBall);
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
        if (typeof value === "string" && value.startsWith("W+")) {
          const n = parseInt(value.split("+")[1], 10);
          return total + (isNaN(n) ? 0 : n);
        }
        return total + 0;
    }
  }, 0);
}

// Function to edit player name
async function editPlayerName(playerIndex) {
  const newName = await showPlayerModalAsync("batsman");
  // const newName = prompt("Enter player name:", players[playerIndex].name);
  if (newName !== null && newName.trim() !== "") {
    players[playerIndex].name = newName.trim();
    updateBatsmenDisplay();
    updateScorecard();
  }
}

async function editBowlerName() {
  const newName = await showPlayerModalAsync("bowler");
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

// Function to retire batsman
function retireBatsman() {
  players[striker].bowlsFaced.push("RO");
  if (nextBatsman < 11) {
    striker = nextBatsman;
    nextBatsman++;
    updateBatsmenDisplay();
  } else {
    alert("All out!");
    // Handle all out scenario
  }
}

// Function to bring in new batsman (after wicket)
function newBatsman(outNonStriker = false) {
  // Find retired players
  const retiredPlayers = players.filter((player) =>
    player.bowlsFaced.includes("RO")
  );

  // Find available batsmen from allAvailablePlayers who haven't batted yet
  const battedNames = new Set(players.map((p) => p.name.trim().toLowerCase()));
  const availableBatsmen = allAvailablePlayers.filter(
    (name) => !battedNames.has(name.trim().toLowerCase())
  );

  let modalHtml = "";

  // Section 1: Select a retired player (if any)
  if (retiredPlayers.length > 0) {
    modalHtml += `<div class="mb-2"><strong>Select a retired player to return:</strong><div class="d-flex flex-wrap gap-2">`;
    retiredPlayers.forEach((player) => {
      modalHtml += `<button type="button" class="list-group-item list-group-item-action flex-fill text-center p-2 m-0"
					style="background-color:#f8d7da;color:#842029;width:auto;min-width:unset;max-width:100%;white-space:nowrap;"
					onclick="selectRetiredPlayer(${player.index})">
					<img src="/icons/retired.png" alt="(retired)" style="height:1em;vertical-align:middle;margin-right:4px;">
					${player.name}
				</button>`;
    });
    modalHtml += `</div></div>`;
  }

  // Section 2: Select a new batsman from available players
  //Remove colors here. (keep two colors, left and right)
  if (availableBatsmen.length > 0) {
    modalHtml += `<div class="mb-2"><strong>Select a new batsman:</strong><div class="d-flex flex-wrap gap-2">`;
    const colors = [
      "#0d6efd", // blue
      "#198754", // green
      "#dc3545", // red
      "#fd7e14", // orange
      "#6f42c1", // purple
      "#20c997", // teal
      "#ffc107", // yellow
      "#6610f2", // indigo
      "#0dcaf0", // cyan
      "#6c757d", // gray
      "#f8f9fa", // light
      "#343a40", // dark
    ];
    availableBatsmen.forEach((name, idx) => {
      const color = colors[idx % colors.length];
      const textColor =
        idx % colors.length === 6 || idx % colors.length === 10
          ? "#212529"
          : "#fff";
      modalHtml += `<button type="button" class="list-group-item list-group-item-action flex-fill text-center p-2 m-0"
					style="background-color:${color};color:${textColor};width:auto;min-width:unset;max-width:100%;white-space:nowrap;"
					onclick="selectAvailableBatsman('${name.replace(
            /'/g,
            "\\'"
          )}')">${name}</button>`;
    });
    modalHtml += `</div></div>`;
  }

  // Always show input for custom player name
  modalHtml += `
			<div class="mb-2">
				<strong>Or enter a new batsman:</strong>
				<div class="input-group">
					<input type="text" class="form-control" id="custom-batsman-input" placeholder="Enter new batsman name">
					<button class="btn btn-primary" type="button" onclick="
						(function() {
							const name = document.getElementById('custom-batsman-input').value.trim();
							if (name) {
								selectAvailableBatsman(name);
								if (!allAvailablePlayers.includes(name)) {
									allAvailablePlayers.push(name);
								}
							}
							$('#retiredPlayersModal').modal('hide');
						})()
					">Select</button>
				</div>
			</div>
		`;

  // Optional: allow Enter key to trigger selection
  setTimeout(() => {
    const input = document.getElementById("custom-batsman-input");
    if (input) {
      input.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          const name = input.value.trim();
          if (name) {
            selectAvailableBatsman(name);
            if (!allAvailablePlayers.includes(name)) {
              allAvailablePlayers.push(name);
            }
          }
          $("#retiredPlayersModal").modal("hide");
        }
      });
    }
  }, 0);
  // Add to modal and show
  $("#retiredPlayersList").html(modalHtml);

  // When modal is dismissed without any selection, bring in next batsman
  // Track if a selection was made
  let selectionMade = false;

  // Wrap the selection functions to set the flag
  const originalSelectAvailableBatsman = window.selectAvailableBatsman;
  window.selectAvailableBatsman = function (name) {
    selectionMade = true;
    originalSelectAvailableBatsman(name, outNonStriker);
  };
  const originalSelectRetiredPlayer = window.selectRetiredPlayer;
  window.selectRetiredPlayer = function (playerIndex) {
    selectionMade = true;
    originalSelectRetiredPlayer(playerIndex, outNonStriker);
  };

  $("#retiredPlayersModal")
    .off("hidden.bs.modal")
    .on("hidden.bs.modal", function () {
      // Only bring in next batsman if no selection was made
      if (!selectionMade) {
        setNextBatsman(outNonStriker);
        updateBatsmenDisplay();
        updateScorecard();
      }
      // Clean up
      window.selectAvailableBatsman = originalSelectAvailableBatsman;
      window.selectRetiredPlayer = originalSelectRetiredPlayer;
    });
  $("#retiredPlayersModal").modal("show");
}

// Handler for selecting a new batsman from available players
function selectAvailableBatsman(name, outNonStriker = false) {
  if (!name) return;
  // Find the next available player slot
  if (nextBatsman < players.length) {
    players[nextBatsman].name = name;
    if (!outNonStriker) {
      striker = nextBatsman;
    } else {
      nonStriker = nextBatsman;
    }
    nextBatsman++;
    $("#retiredPlayersModal").modal("hide");
    updateBatsmenDisplay();
    updateScorecard();
  } else {
    alert("All out!");
  }
}

function selectRetiredPlayer(playerIndex, outNonStriker = false) {
  // Bring back the selected retired player
  players[playerIndex].bowlsFaced.pop(); // Remove "RO" from their bowlsFaced
  if (!outNonStriker) {
    striker = playerIndex;
  } else {
    nonStriker = playerIndex;
  }
  nextBatsman = Math.max(nextBatsman, playerIndex + 1); // Update next batsman if needed
  $("#retiredPlayersModal").modal("hide");
  updateBatsmenDisplay();
  updateScorecard();
}

function setNextBatsman(outNonStriker = false) {
  if (nextBatsman < 11) {
    if (!outNonStriker) {
      striker = nextBatsman;
    } else {
      nonStriker = nextBatsman;
    }
    nextBatsman++;
  } else {
    alert("All out!");
    // Handle all out scenario
  }
}
// Function to select a new batsman instead of a retired player
function selectNewBatsman() {
  setNextBatsman();
  $("#retiredPlayersModal").modal("hide");
  updateBatsmenDisplay();
  updateScorecard();
}

// Function to update the player scorecard
// Updated updateScorecard function - replace the existing one in main.js

function updateScorecard() {
  let scorecardHtml = "";

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
    let playerSixes = player.bowlsFaced.filter((x) => x === 6).length;
    let playerFours = player.bowlsFaced.filter((x) => x === 4).length;
    let playerRuns = sumScores(player.bowlsFaced);
    let playerBalls = player.bowlsFaced.filter((x) => x !== "RO").length;
    let isOut = player.bowlsFaced.includes("W") || player.outOver == "runout";
    let isRetired = player.bowlsFaced.includes("RO");
    if (hasNotBatted) {
      continue; // Skip players who haven't batted
    }

    // Calculate strike rate (runs ÷ balls × 100)
    const strikeRate =
      playerBalls > 0 ? ((playerRuns / playerBalls) * 100).toFixed(2) : "0.00";

    // Add player row with broadcast styling
    scorecardHtml += `
			<tr>
			<td>
				<span class="broadcast-player-name" onclick="editPlayerName(${i})">${
      player.name
    }</span> 
				${
          isStriker
            ? '<img src="/icons/cricket-bat.png" alt="*" class="broadcast-bat-icon">'
            : ""
        }
				${
          isOut
            ? '<img src="/icons/out.png" alt="(out)" class="broadcast-status-icon">'
            : ""
        }
				${
          isOut && player.outOver
            ? player.outOver === "runout"
              ? `<span>runout</span>`
              : `<span>b ${scoreboard[player.outOver][2]} </span>`
            : ""
        }
				${
          isRetired
            ? '<img src="/icons/retired.png" alt="(retired)" class="broadcast-status-icon">'
            : ""
        }
				${
          isNonStriker && !isOut && !isRetired
            ? '<span class="broadcast-status-text">not out</span>'
            : ""
        }
			</td>
			<td>${hasNotBatted ? "-" : playerRuns}</td>
			<td>${hasNotBatted ? "-" : playerBalls}</td>
			<td>${hasNotBatted ? "-" : playerFours}</td>
			<td>${hasNotBatted ? "-" : playerSixes}</td>
			<td>${hasNotBatted ? "-" : strikeRate}</td>
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

  // Add extras and total rows with broadcast styling
  const extras = runs - totalRuns; // Calculate extras

  scorecardHtml += `
		<tr class="broadcast-extras-row">
			<td><strong>Extras</strong></td>
			<td colspan="5"><strong>${extras}</strong> (Wides, No-balls, etc.)</td>
		</tr>
		<tr class="broadcast-total-row">
			<td><strong>TOTAL</strong></td>
			<td><strong>${runs}</strong></td>
			<td><strong>${totalBalls}</strong></td>
			<td><strong>${totalFours}</strong></td>
			<td><strong>${totalSixes}</strong></td>
			<td><strong>${
        totalBalls > 0 ? ((runs / totalBalls) * 100).toFixed(2) : "0.00"
      }</strong></td>
		</tr>
		`;

  // Update the scorecard table
  updateHtml("#batting-scorecard", scorecardHtml);

  bowlingScorecard();
}

function bowlingScorecard() {
  let scoreboardHtml = "";
  bowlerScorecard = restructureByBowler(scoreboard);
  let totalOvers = 0;
  let maidensAndRunsAndWickets = [0, 0, 0];

  for (const bowler in bowlerScorecard) {
    totalOvers = bowlerScorecard[bowler].length;
    let currentOver = bowlerScorecard[bowler][totalOvers - 1];
    let economy = 0;
    if (currentOver.runs.length <= 6) {
      economy = totalOvers - 1;
      economy = economy + (currentOver.runs.length - 1) / 6;
    } else {
      economy = totalOvers;
    }
    maidensAndRunsAndWickets = calculateNumberOfMadiens(
      bowlerScorecard[bowler]
    );
    scoreboardHtml += `
			<tr>
				<td onclick="changeBowlerName('${bowler}')"><span class="broadcast-player-name">${bowler}</span></td>
				<td>${formatOvers(totalOvers, currentOver)}</td>
				<td>${maidensAndRunsAndWickets[0]}</td>
				<td>${maidensAndRunsAndWickets[1]}</td>
				<td>${maidensAndRunsAndWickets[2]}</td>
				<td>${
          economy === 0
            ? "0.00"
            : (maidensAndRunsAndWickets[1] / economy).toFixed(2)
        }</td>
			</tr>
			`;
  }

  updateHtml(
    "#run-rate",
    `<span>Run Rate : ${(runs / over_no).toFixed(2)}</span>`
  );

  updateHtml("#bowling-scorecard", scoreboardHtml);
}

async function changeBowlerName(bowler) {
  const newName = await showPlayerModalAsync("bowler");
  if (newName === null || newName.trim() === "") {
    return;
  }
  for (let i = 1; i < scoreboard.length; i++) {
    if (scoreboard[i][2] === bowler) {
      scoreboard[i][2] = newName;
    }
  }
  updateScorecard();
  updateBowlerDisplay();
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

function calculateNumberOfMadiens(overs) {
  let totalRunsForBowler = 0;
  let numberOfMaidens = 0;
  let numberOfWickets = 0;
  if (overs.length <= 1 && overs[0].runs.length < 6) {
    let firstOver = overs[0];
    let runs = sumScores(firstOver.runs);
    totalRunsForBowler += runs + firstOver.extras;
    numberOfWickets += firstOver.runs.filter((item) => item === "W").length;
  } else {
    overs.forEach((over) => {
      let runs = sumScores(over.runs);
      if (over.runs.length >= 6 && runs + over.extras == 0) {
        numberOfMaidens++;
      }
      totalRunsForBowler += runs + over.extras;
      numberOfWickets += over.runs.filter((item) => item === "W").length;
    });
  }

  return [numberOfMaidens, totalRunsForBowler, numberOfWickets];
}

function restructureByBowler(scoreboard) {
  const bowlers = {};

  let bowlerName = "";
  // Start from index 1 to skip first team innings
  for (let i = 1; i < scoreboard.length; i++) {
    bowlerName = scoreboard[i][2];
    if (!bowlers[bowlerName]) {
      bowlers[bowlerName] = [];
    }
    bowlers[bowlerName].push({
      runs: scoreboard[i][0],
      extras: scoreboard[i][1],
    });
  }

  return bowlers;
}

//#endregion

//#region UI Modification

//show Player Selector Modal

function showPlayerModalAsync(playeName = "player") {
  return new Promise((resolve) => {
    // Build the modal content
    let modalContent = `
		<div class="modal-body">
			<h5>Select a ${playeName}</h5>
			<div class="list-group mb-3">`;

    // Get existing bowlers

    modalContent += `<div class="d-flex flex-wrap gap-1 mb-2">`;
    // Filter out names already used in players (by name, case-insensitive)
    const usedNames = new Set(players.map((p) => p.name.trim().toLowerCase()));
    const filteredPlayers = allAvailablePlayers.filter(
      (player) => !usedNames.has(player.trim().toLowerCase())
    );

    // Use Bootstrap grid to ensure 2 per row
    modalContent += `<div class="row g-1 mb-2">`;
    filteredPlayers.forEach((player, idx) => {
      // Alternate colors
      const colors = ["#0d6efd", "#198754"];
      const textColors = ["#fff", "#fff"];
      const color = colors[idx % 2];
      const textColor = textColors[idx % 2];
      modalContent += `
				<div class="col-6">
					<button type="button" class="list-group-item list-group-item-action text-center p-2 m-0 w-100"
						style="background-color:${color};color:${textColor};white-space:nowrap;"
						onclick="selectPlayer('${player}')">${player}</button>
				</div>
			`;
    });
    modalContent += `</div>`;
    modalContent += `</div>`;
    // Add input for new bowler
    modalContent += `
			</div>
			<div class="input-group mb-3">
			<input type="text" class="form-control" id="new-player-input" placeholder="Create a new player">
			<button class="btn btn-primary" type="button" onclick="selectNewPlayer()">Select</button>
			</div>
		</div>
		`;

    // Set the modal content
    $("#changePlayerContainer").html(modalContent);

    // Define global functions to handle selections
    window.selectedPlayerName = null;
    window.playerModalResolved = false;

    window.selectPlayer = function (name) {
      window.selectedPlayerName = name;
      window.playerModalResolved = true;
      $("#changePlayerModal").modal("hide");
    };

    window.selectNewPlayer = function () {
      const newName = $("#new-player-input").val().trim();
      if (newName) {
        window.selectedPlayerName = newName;
        window.playerModalResolved = true;
        allAvailablePlayers.push(newName); // Add new player to the list
        $("#changePlayerModal").modal("hide");
      }
    };

    // Set up input field to respond to Enter key
    document
      .getElementById("new-player-input")
      .addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          window.selectNewPlayer();
        }
      });

    // Show the modal
    $("#changePlayerModal").modal("show");

    // Handle modal hidden event - this fires no matter how the modal is closed
    $("#changePlayerModal").on("hidden.bs.modal", function () {
      // Always resolve the promise, regardless of how modal was closed
      if (window.playerModalResolved && window.selectedPlayerName) {
        resolve(window.selectedPlayerName);
      } else {
        // Default if modal was closed without selection (X button, escape, clicking outside, etc.)
        resolve("Player " + allAvailablePlayers.length);
      }

      // Clean up global functions and variables
      window.selectPlayer = undefined;
      window.selectNewPlayer = undefined;
      window.selectedPlayerName = undefined;
      window.playerModalResolved = undefined;

      // Remove the event handler to prevent memory leaks
      $("#changePlayerModal").off("hidden.bs.modal");
    });
  });
}

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
    for (const bowler in bowlers) {
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

    window.selectBowler = function (name) {
      window.selectedBowlerName = name;
      window.bowlerModalResolved = true;
      $("#changeBowlerModal").modal("hide");
    };

    window.selectNewBowler = function () {
      const newName = $("#new-bowler-input").val().trim();
      if (newName) {
        window.selectedBowlerName = newName;
        window.bowlerModalResolved = true;
        $("#changeBowlerModal").modal("hide");
      }
    };

    // Set up input field to respond to Enter key
    document
      .getElementById("new-bowler-input")
      .addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          window.selectNewBowler();
        }
      });

    // Show the modal
    $("#changeBowlerModal").modal("show");

    // Handle modal hidden event - this fires no matter how the modal is closed
    $("#changeBowlerModal").on("hidden.bs.modal", function () {
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
      $("#changeBowlerModal").off("hidden.bs.modal");
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

  let closeButton = "";
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

  calculatePartnership();
}

function updateBowlerDisplay() {
  let currentBowlerScorecard =
    restructureByBowler(scoreboard)[scoreboard[over_no][2]];
  let maidensAndRunsAndWickets = calculateNumberOfMadiens(
    currentBowlerScorecard
  );
  updateHtml("#bowler-name", scoreboard[over_no][2]);
  updateHtml("#bowler-runs", maidensAndRunsAndWickets[1]);
  updateHtml("#bowler-wickets", maidensAndRunsAndWickets[2]);
}

//#endregion

//#region Score Modification

function back_button() {
  if (allDeliveries.length == 0) return;

  var last = allDeliveries.pop();

  if (last.isNoBall) {
    runs -= last.run;
    if (last.run - 1 == 1 || last.run - 1 == 3 || last.run - 1 == 5) {
      players[nonStriker].bowlsFaced.pop();
      swapBatsmen();
    } else {
      players[striker].bowlsFaced.pop();
      scoreboard[over_no][1] -= last.run;
    }
    scoreboard[over_no][0].splice(ball_no, 1);
  } else if (last.run == "+") {
    runs--;
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
    } else if (last.run == 1 || last.run == 3 || last.run == 5) {
      players[nonStriker].bowlsFaced.pop();
      swapBatsmen();
    } else {
      players[striker].bowlsFaced.pop();
    }
    scoreboard[over_no][0].splice(ball_no, 1);
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
  if (isShareMode) {
    return;
  }
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    console.error("Failed to create match:", error);
  }
}

async function saveMatchState() {
  if (!currentMatchCode) {
    return;
  }

  const matchData = {
    scoreboard,
    players,
    allDeliveries,
    ball_no,
    over_no,
    runs,
    striker,
    nonStriker,
    nextBatsman,
    isNoBall,
    isTargetMode,
    targetRuns,
    targetOvers,
    bowlerScorecard,
    allAvailablePlayers,
  };

  try {
    const response = await fetch(`${API_BASE}/match/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchCode: currentMatchCode, matchData }),
    });

    const result = await response.json();
    if (result.success) {
      updateMatchCodeDisplay(); // Update last saved time
    }
  } catch (error) {
    console.error("Save failed:", error);
  }
}

async function loadMatchByCode(matchCode = null) {
  if (!matchCode) {
    matchCode = prompt("Enter match code:");
    if (!matchCode) return;
  }

  matchCode = matchCode.toUpperCase().trim();

  if (allDeliveries.length > 0) {
    if (!confirm("Loading will overwrite current match. Continue?")) {
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
      scoreboard = data.scoreboard || [
        [],
        [(runs = [[0]]), (extras = 0), (bowler = "Bowler 1")],
      ];
      players =
        data.players ||
        Array(11)
          .fill()
          .map((_, i) => ({ name: "Player " + (i + 1), bowlsFaced: [] }));
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
      allAvailablePlayers = data.allAvailablePlayers || [];

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
    console.error("Load failed:", error);
  }
}

function updateMatchCodeDisplay() {
  if (currentMatchCode) {
    const displayText = `Match Code: ${currentMatchCode}`;
    // You can add this to any part of your UI
    updateHtml("#match-code-display", displayText);
  } else {
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
        result.matches.forEach((match) => {
          const date = new Date(match.lastUpdated).toLocaleDateString();
          const time = new Date(match.lastUpdated).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const starButton = `<button class="btn ${
            match.isStarred ? "btn-warning" : "btn-outline-warning"
          } btn-sm" onclick="toggleStar('${match.matchCode}')">${
            match.isStarred ? "★" : "☆"
          }</button>`;
          const deleteButton = `<button class="btn btn-outline-danger btn-sm" onclick="deleteMatch('${
            match.matchCode
          }')" ${match.isStarred ? "disabled" : ""}>Delete</button>`;

          matchesHtml += `
				<div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
				<button class="btn btn-outline-primary btn-sm col-4" onclick="loadMatchByCode('${match.matchCode}')" data-dismiss="modal">
					${match.matchCode}
				</button>
				<small class="text-muted col-4 ms-2">${date} ${time}</small>
				<div class="col-4 d-flex gap-1 justify-content-end">
					${starButton}
					${deleteButton}
				</div>
				</div>
			`;
        });
      }

      updateHtml("#recent-matches-list", matchesHtml);
      return result.matches;
    }
  } catch (error) {
    console.error("Failed to list matches:", error);
    updateHtml(
      "#recent-matches-list",
      '<p class="text-danger">Failed to load matches</p>'
    );
  }
  return [];
}

async function loadRecentMatches() {
  updateHtml("#recent-matches-list", '<p class="text-muted">Loading...</p>');
  await listMatches();
}

async function deleteMatch(matchCode) {
  if (!matchCode) {
    matchCode = prompt("Enter match code to delete:");
    if (!matchCode) return;
  }

  matchCode = matchCode.toUpperCase().trim();

  //   if (!confirm(`Are you sure you want to delete match ${matchCode}? This cannot be undone.`)) {
  //     return;
  //   }

  try {
    const response = await fetch(`${API_BASE}/match/${matchCode}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      // If we deleted the current match, clear the UI
      if (currentMatchCode === matchCode) {
        currentMatchCode = null;
        updateMatchCodeDisplay();
      }

      // Refresh matches list if displayed
      if (
        document
          .getElementById("recent-matches-list")
          .innerHTML.includes("btn-outline-primary")
      ) {
        await listMatches();
      }
    } else {
      alert("Delete failed: " + result.error);
    }
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Delete failed - check if backend is running");
  }
}

function exportModalAsImage() {
  const modal = document.querySelector(".scorecard-broadcast");

  html2canvas(modal, {
    backgroundColor: null, // Transparent background
    scale: 2, // Higher quality
  }).then((canvas) => {
    const link = document.createElement("a");
    link.download = "match-scorecard.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

async function toggleStar(matchCode) {
  try {
    const response = await fetch(`${API_BASE}/match/star`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchCode }),
    });

    if (response.ok) {
      await listMatches(); // Refresh the list
    }
  } catch (error) {
    console.error("Star toggle failed:", error);
  }
}

//Partnerships

function calculatePartnerships() {
  let partnerships = [];
  let currentPartnership = null;
  let activeBatsmen = new Set();

  // Track who's currently batting (not out)
  for (let i = 0; i < allDeliveries.length; i++) {
    const delivery = allDeliveries[i];
    const strikerIndex = delivery.striker;
    const run = delivery.run;

    // Add striker to active batsmen if not already there
    activeBatsmen.add(strikerIndex);

    // If this is the first delivery or we don't have a current partnership, start one
    if (!currentPartnership) {
      currentPartnership = {
        batsman1: Math.min(...activeBatsmen),
        batsman2: Math.max(...activeBatsmen),
        runs: 0,
        balls: 0,
        startDelivery: i,
        endDelivery: null,
        isActive: true,
      };
    }

    // Add runs to current partnership (excluding wickets)
    if (run !== "W" && run !== "RO") {
      if (typeof run === "number") {
        currentPartnership.runs += run;
      } else if (run === "+" || run === "NB") {
        currentPartnership.runs += 1;
      }
      // Count balls faced (not extras)
      if (run !== "+" && run !== "NB") {
        currentPartnership.balls++;
      }
    }

    // If wicket or retirement, end current partnership
    if (run === "W" || run === "RO") {
      if (currentPartnership) {
        currentPartnership.endDelivery = i;
        currentPartnership.isActive = false;
        partnerships.push(currentPartnership);

        // Remove the dismissed/retired batsman
        activeBatsmen.delete(strikerIndex);

        // Start new partnership if there are still batsmen
        if (activeBatsmen.size > 0) {
          // Find the next batsman who will come in
          let nextBatsmanIndex = nextBatsman;
          activeBatsmen.add(nextBatsmanIndex);

          currentPartnership = {
            batsman1: Math.min(...activeBatsmen),
            batsman2: Math.max(...activeBatsmen),
            runs: 0,
            balls: 0,
            startDelivery: i + 1,
            endDelivery: null,
            isActive: true,
          };
        } else {
          currentPartnership = null;
        }
      }
    }
  }

  // If we have an active partnership, add it to the list
  if (currentPartnership && currentPartnership.isActive) {
    partnerships.push(currentPartnership);
  }

  return partnerships;
}

function getCurrentPartnership() {
  const partnerships = calculatePartnerships();
  const currentPartnership = partnerships.find((p) => p.isActive);

  if (!currentPartnership) {
    return {
      batsman1Name: players[striker]?.name || "Player",
      batsman2Name: players[nonStriker]?.name || "Player",
      runs: 0,
      balls: 0,
    };
  }

  return {
    batsman1Name: players[currentPartnership.batsman1]?.name || "Player",
    batsman2Name: players[currentPartnership.batsman2]?.name || "Player",
    runs: currentPartnership.runs,
    balls: currentPartnership.balls,
  };
}

function calculatePartnership() {
  const partnership = getCurrentPartnership();

  // Update local display
  const partnershipElement = document.getElementById("partnership");
  if (partnershipElement) {
    partnershipElement.textContent = `${partnership.runs} (${partnership.balls})`;
  }

  // Send to overlay via MQTT if in share mode
  if (isShareMode) {
    updateHtml("#partnership", `${partnership.runs} (${partnership.balls})`);
  }

  return partnership;
}

function enterWicketMode() {
  isWicketMode = true;

  // Change button texts to wicket types
  $("#run_1").text("Bowled");
  $("#run_2").text("Caught");
  $("#run_3").text("LBW");
  $("#run_4").text("Run Out");
  $("#run_6").text("Stumped");

  // Change wicket button to show it's active
  $("#run_W").text("Cancel").css({
    "background-color": "#dc3545",
    color: "white",
  });

  // Disable other buttons that shouldn't be used in wicket mode
  $("#run_dot").prop("disabled", true);
  $("#run_wide").prop("disabled", true);
  $("#run_no_ball").prop("disabled", true);
}

function enterRunOutMode() {
  isRunOutMode = true;

  // Change button texts to run counts
  $("#run_1").text("0 runs");
  $("#run_2").text("1 run");
  $("#run_3").text("2 runs");
  $("#run_4").text("disabled");
  $("#run_6").text("disabled");

  $("#run_4").prop("disabled", true);
  $("#run_6").prop("disabled", true);

  // Change wicket button text
  $("#run_W").text("Back");
}

function showRunOutPlayerSelection() {
  let modalContent = `
	<div class="modal-body">
		<h5>Who got run out?</h5>
		<p class="text-muted mb-3">Completed runs: ${selectedRunOutRuns}</p>
		<div class="d-grid gap-2">
		<button type="button" class="btn btn-outline-primary btn-lg" 
				onclick="processRunOut(${striker})">
			${players[striker].name} (Striker)
			<br><small class="text-muted">${sumScores(players[striker].bowlsFaced)} (${
    players[striker].bowlsFaced.length
  })</small>
		</button>
		<button type="button" class="btn btn-outline-primary btn-lg" 
				onclick="processRunOut(${nonStriker})">
			${players[nonStriker].name} (Non-striker)  
			<br><small class="text-muted">${sumScores(players[nonStriker].bowlsFaced)} (${
    players[nonStriker].bowlsFaced.length
  })</small>
		</button>
		</div>
	</div>
	`;

  $("#changePlayerContainer").html(modalContent);
  $("#changePlayerModal").modal("show");
}

function exitWicketMode() {
  isWicketMode = false;
  isRunOutMode = false;

  // Restore original button texts
  $("#run_1").text("1");
  $("#run_2").text("2");
  $("#run_3").text("3");
  $("#run_4").text("4");
  $("#run_6").text("6");

  // Restore wicket button
  $("#run_W").text("Wicket").css({
    "background-color": "",
    color: "",
  });

  // Re-enable other buttons
  $("#run_dot").prop("disabled", false);
  $("#run_wide").prop("disabled", false);
  $("#run_no_ball").prop("disabled", false);
  $("#run_4").prop("disabled", false);
  $("#run_6").prop("disabled", false);

}


function processRunOut(playerIndex) {
  const runOutCode = "W+" + selectedRunOutRuns + "+" + playerIndex;

  play_ball(runOutCode, 0);

  $("#changePlayerModal").modal("hide");
  exitWicketMode();
}

function exitRunOutMode() {
  isRunOutMode = false;
  // Go back to wicket mode

  $("#run_4").prop("disabled", false);
  $("#run_6").prop("disabled", false);

  enterWicketMode();
}
