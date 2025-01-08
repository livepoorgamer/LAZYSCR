// -------------- PART 1: FETCH emails.json FROM GITHUB PAGES --------------
let airportData = {}; // We'll store the emails.json data here

// Runs after DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  // If your emails.json file is stored in the /assets folder of your repo,
  // use the relative path "assets/emails.json"
  fetch("assets/emails.json")
    .then(response => response.json())
    .then(data => {
      airportData = data;
      console.log("Loaded airport data:", airportData);
    })
    .catch(error => {
      console.error("Error loading emails.json:", error);
    });
});

// Helper function: get email by airport code
function getAirportEmail(airportCode) {
  if (airportData[airportCode]) {
    return airportData[airportCode].email;
  }
  return "default@example.com"; // fallback if airport code not found
}

// -------------- PART 2: EXISTING LOGIC / GLOBAL VARS --------------
let currentSlotType = "";           // e.g. "NEW SLOT" or "CANCEL SLOT"
let currentDepartureAirport = "";   // e.g. "STN"
let currentArrivalAirport = "";     // e.g. "DUB"

// Maps day-of-week to operation code
function getDayOfOperation(dayOfWeek) {
  const dayMapping = {
    "Sunday":    "0000007",
    "Monday":    "1000000",
    "Tuesday":   "0200000",
    "Wednesday": "0030000",
    "Thursday":  "0004000",
    "Friday":    "0000500",
    "Saturday":  "0000060"
  };
  return dayMapping[dayOfWeek] || "1000000"; 
}

// Parse user input
function parseInput(input) {
  const parts = input.trim().split(" ");
  if (parts.length !== 7) {
    return null; // must have 7 parts
  }
  const flightRaw = parts[0];
  const from = parts[1];
  const to = parts[2];
  const date = parts[3].slice(0, 5);  // e.g. "21DEC"
  const fullDate = parts[3];         // e.g. "21DEC2024"
  const departureTime = parts[4];
  const arrivalTime = parts[5];
  const code = parts[6];

  // Convert date to dayOfWeek
  const parsedDate = new Date(fullDate);
  const dayOfWeek = parsedDate.toLocaleDateString("en-US", { weekday: "long" });
  const dayOfOperation = getDayOfOperation(dayOfWeek);

  // Flight prefix + remove trailing 'P'
  const flightPrefix = flightRaw.slice(0, 2);
  let flightNumber = flightRaw.slice(2);
  const flightDigits = flightNumber.match(/\d+/)?.[0] || "";
  let flightLetters = flightNumber.replace(/\d+/g, "");

  // If flightLetters ends with 'P', remove it
  if (flightLetters.endsWith("P")) {
    flightLetters = flightLetters.slice(0, -1);
  }

  const paddedFlightDigits = flightDigits.padStart(3, "0");
  const flight = `${flightPrefix}${paddedFlightDigits}${flightLetters}`;

  return {
    flight,
    from,
    to,
    date,
    fullDate,
    departureTime,
    arrivalTime,
    code,
    dayOfOperation
  };
}

function getSelectedOption() {
  return document.getElementById("dropdownMenu").value; // P, D, K, T, J
}

// Returns "NEW SLOT" or "CANCEL SLOT"
function getSlotType() {
  const val = document.getElementById("slotType").value;
  return val === "NEW" ? "NEW SLOT" : "CANCEL SLOT";
}

function getAircraftReg() {
  const regInput = document.getElementById("regInput").value.trim();
  return regInput || "[UNKNOWN REG]";
}

function getCodePrefix(option) {
  switch (option) {
    case "P":
    case "T":
    case "K":
      return "000";
    case "J":
      return "189";
    case "D":
      return "008";
    default:
      return "000";
  }
}

// Hide both output containers
function hideAllContainers() {
  document.getElementById("departureContainer").style.display = "none";
  document.getElementById("arrivalContainer").style.display = "none";
  document.getElementById("departureOutput").textContent = "";
  document.getElementById("arrivalOutput").textContent = "";
}

// -------------- DEPARTURE FORMAT --------------
function formatDeparture() {
  hideAllContainers();

  const input = document.getElementById("userInput").value;
  const data = parseInput(input);
  if (!data) {
    alert("Error: Invalid input format. Make sure you have 7 parts.");
    return;
  }

  currentSlotType = getSlotType();          // "NEW SLOT" or "CANCEL SLOT"
  currentDepartureAirport = data.from;      // for subject line (sendEmail)

  // Update headings (avoid error by ensuring these elements exist)
  document.getElementById("departureHeading").textContent = `Departure [${data.from}]`;
  document.getElementById("arrivalHeading").textContent = `Arrival [${data.to}]`;

  const { flight, from, to, date, departureTime, dayOfOperation } = data;
  const option = getSelectedOption();       // P, D, K, T, J
  const codePrefix = getCodePrefix(option);
  const reg = getAircraftReg();

  // flightType
  const flightType = currentSlotType === "CANCEL SLOT" ? "D" : "N";

  // e.g.: if option === "D", show reg in SI line
  const siLine =
    option === "D"
      ? `SI ${currentSlotType} REQ ${from} // LEARJET REG: ${reg}`
      : `SI ${currentSlotType} REQ ${from}`;

  // Notice the double `${date}` below may need to be refined if unintentional
  const output = `
SCR 
W24 
${date} 
${from} 
${flightType} ${flight} ${date}${date} ${dayOfOperation} ${codePrefix}73H ${departureTime}${to} ${option} 
${siLine}
  `.trim();

  document.getElementById("departureOutput").textContent = output;
  document.getElementById("departureContainer").style.display = "block";
}

// -------------- ARRIVAL FORMAT --------------
function formatArrival() {
  hideAllContainers();

  const input = document.getElementById("userInput").value;
  const data = parseInput(input);
  if (!data) {
    alert("Error: Invalid input format. Make sure you have 7 parts.");
    return;
  }

  currentSlotType = getSlotType();
  currentArrivalAirport = data.to; // for subject line (sendEmail)

  // Optional heading update
  document.getElementById("departureHeading").textContent = `Departure [${data.from}]`;
  document.getElementById("arrivalHeading").textContent = `Arrival [${data.to}]`;

  const { flight, from, to, date, arrivalTime, dayOfOperation } = data;
  const option = getSelectedOption();
  const codePrefix = getCodePrefix(option);
  const reg = getAircraftReg();

  const flightType = currentSlotType === "CANCEL SLOT" ? "D" : "N";

  const siLine =
    option === "D"
      ? `SI ${currentSlotType} REQ ${to} // LEARJET REG: ${reg}`
      : `SI ${currentSlotType} REQ ${to}`;

  const output = `
SCR 
W24 
${date} 
${to} 
${flightType}${flight} ${date}${date} ${dayOfOperation} ${codePrefix}73H ${from}${arrivalTime} ${option} 
${siLine}
  `.trim();

  document.getElementById("arrivalOutput").textContent = output;
  document.getElementById("arrivalContainer").style.display = "block";
}

// -------------- BOTH FORMAT --------------
function formatBoth() {
  hideAllContainers();

  const input = document.getElementById("userInput").value;
  const data = parseInput(input);
  if (!data) {
    alert("Error: Invalid input format. Make sure you have 7 parts.");
    return;
  }

  currentSlotType = getSlotType();
  currentDepartureAirport = data.from;
  currentArrivalAirport = data.to;

  // Optional heading update
  document.getElementById("departureHeading").textContent = `Departure [${data.from}]`;
  document.getElementById("arrivalHeading").textContent = `Arrival [${data.to}]`;

  const { flight, from, to, date, departureTime, arrivalTime, dayOfOperation } = data;
  const option = getSelectedOption();
  const codePrefix = getCodePrefix(option);
  const reg = getAircraftReg();

  const flightType = currentSlotType === "CANCEL SLOT" ? "D" : "N";

  // DEPARTURE
  const departureSiLine =
    option === "D"
      ? `SI ${currentSlotType} REQ ${from} // LEARJET REG: ${reg}`
      : `SI ${currentSlotType} REQ ${from}`;
  const departureOutputStr = `
SCR 
W24 
${date} 
${from} 
${flightType} ${flight} ${date}${date} ${dayOfOperation} ${codePrefix}73H ${departureTime}${to} ${option} 
${departureSiLine}
  `.trim();

  // ARRIVAL
  const arrivalSiLine =
    option === "D"
      ? `SI ${currentSlotType} REQ ${to} // LEARJET REG: ${reg}`
      : `SI ${currentSlotType} REQ ${to}`;
  const arrivalOutputStr = `
SCR 
W24 
${date} 
${to} 
${flightType}${flight} ${date}${date} ${dayOfOperation} ${codePrefix}73H ${from}${arrivalTime} ${option} 
${arrivalSiLine}
  `.trim();

  // Show both
  document.getElementById("departureOutput").textContent = departureOutputStr;
  document.getElementById("arrivalOutput").textContent = arrivalOutputStr;
  document.getElementById("departureContainer").style.display = "block";
  document.getElementById("arrivalContainer").style.display = "block";
}

// -------------- PART 3: SEND EMAIL --------------
function sendEmail(type) {
  let output = "";
  let subject = "";
  let airportCode = "";

  if (type === "departure") {
    output = document.getElementById("departureOutput").textContent.trim();
    if (!output) {
      alert("No DEPARTURE SCR message found. Please format again.");
      return;
    }
    airportCode = currentDepartureAirport;
    subject = `${currentSlotType} REQ ${airportCode}`;
  } else {
    output = document.getElementById("arrivalOutput").textContent.trim();
    if (!output) {
      alert("No ARRIVAL SCR message found. Please format again.");
      return;
    }
    airportCode = currentArrivalAirport;
    subject = `${currentSlotType} REQ ${airportCode}`;
  }

  // Primary recipient from JSON (based on airportCode)
  const recipientEmail = getAirportEmail(airportCode);

  // CC
  const ccEmail = "slotdesk@ryanair.com";

  // Build mailto link
  const emailSubject = encodeURIComponent(subject);
  const emailBody = encodeURIComponent(output);
  const mailtoLink = `mailto:${recipientEmail}?cc=${ccEmail}&subject=${emailSubject}&body=${emailBody}`;

  // Trigger email
  window.location.href = mailtoLink;
}

