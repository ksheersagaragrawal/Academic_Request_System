//jshint esversion:6
require('dotenv').config()
const express = require("express");
const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require('path');
const cookieParser = require('cookie-parser');

// Google Auth
const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = process.env.CLIENT_ID; 
const client = new OAuth2Client(CLIENT_ID);

const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


// spreadsheets
const othersID = process.env.OTHERS;
const mainSheet = process.env.MAIN_SHEET;

app.get("/", function (req, res) {
    res.render("login");
})

app.post('/login', (req, res) => {
    let token = req.body.token;

    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();
        const userid = payload['sub'];
    }
    verify()
        .then(() => {
            res.cookie('session-token', token);
            res.send('success')
        })
        .catch(console.error);

});

// get request
app.get('/request', checkAuthenticated, async (req, res) => {
    let user = req.user;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    const mappingSheetId = process.env.MAPPING_SHEET;
    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!P:R",
    });

    console.log(user.email);

    var showDashboard = false;
    if (user.email == process.env.EMAIL_ID) {
        // console.log("here");
        showDashboard = true;
        var sheets = getNewRows.data.values;
        sheets.shift();
        sheets.shift();
        console.log(sheets)
        res.render("dashboard", { user: user, sheets: sheets });
    } else {
        for (var i = 0; i < getNewRows.data.values.length; i++) {
            if (getNewRows.data.values[i][0] == user.email) {
                showDashboard = true;
                res.render("dashboard", { user: user, sheet: getNewRows.data.values[i][2] });
                break
            }
        }
    }

    if (user.email.includes("@iitgn.ac.in") && showDashboard == false) {
        res.render("request_types", { user: user });
    }
    else if (showDashboard == false) {
        // console.log("in else");
        res.render("incorrect_email");
    }
});

// check if user is authenticated
function checkAuthenticated(req, res, next) {

    let token = req.cookies['session-token'];

    let user = {};
    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();
        user.name = payload.name;
        user.email = payload.email;
        user.picture = payload.picture;
    }
    verify()
        .then(() => {
            console.log('success')
            req.user = user;
            next();
        })
        .catch(err => {
            console.log('error')
            res.redirect('/')
        })

}

//Grade Report
app.post("/grade-report", async function (req, res) {
    const { userName, rollNumber, phoneNumber, batch, programme, discipline, semester, message, emailID } = req.body;
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalGradeRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Grade Report") {
            totalGradeRequests += 1;
        }
    }

    var token = `${year}-GR-${totalGradeRequests + 1}`;
    var reciever;
    var spreadsheetId;
    var handlerName;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!A:E",
    });


    for (let i = 0; i < getNewRows.data.values.length; i++) {
        if ((batch == (getNewRows.data.values[i][0])) && (programme == (getNewRows.data.values[i][1]))) {
            reciever = (getNewRows.data.values[i][2]);
            spreadsheetId = (getNewRows.data.values[i][4]);
            handlerName = (getNewRows.data.values[i][3]);
            break
        }
        else {
            reciever = process.env.EMAIL_ID;
            spreadsheetId = othersID;
        }
    }

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName,semester, batch, emailID, phoneNumber, programme, discipline, "Grade Report", rollNumber,,,,,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName,semester, batch, emailID, phoneNumber, programme, discipline, "Grade Report", rollNumber,,,,,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });


        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            subject: `(${token}) Submitted Grade Request`,
            bcc: reciever,
            text: `Dear ${userName},\n\nThank you for Grade Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Grade Request Details:\n\nGrade Request Details\n\nName : ${userName} \nSemester : ${semester} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Grade Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Grade Request Details:<br><br><u><b>Grade Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Semester : </b> ${semester} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Grade Report" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

//Transcript
app.post("/transcript-request", async function (req, res) {
    
    const { userName, emailID, phoneNumber, programme, batch, discipline, rollNumber, message } = req.body;
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });
   
    const client = await auth.getClient();
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });
    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalTranscriptRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Transcript Request") {
            totalTranscriptRequests += 1;
        }
    }
    var token = `${year}-TR-${totalTranscriptRequests + 1}`;
    var reciever;
    var spreadsheetId;
    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!A:E",
    });

    for (let i = 0; i < getNewRows.data.values.length; i++) {
        if ((batch == (getNewRows.data.values[i][0])) && (programme == (getNewRows.data.values[i][1]))) {
            reciever = (getNewRows.data.values[i][2]);
            spreadsheetId = (getNewRows.data.values[i][4]);
            handlerName = (getNewRows.data.values[i][3]);
            break
        }
        else {
            reciever = process.env.EMAIL_ID;
            spreadsheetId = othersID;
        }
    }

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Transcript Request", rollNumber,,,,,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Transcript Request", rollNumber,,,,,message, token, "Pending", currentDate + " | " + time,reciever]],

        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<put admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Transcript Request`,
            text: `Dear ${userName},\n\nThank you for your Transcript Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Transcript Request Details:\n\nTranscript Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Transcript Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Transcript Request Details:<br><br><u><b>Transcript Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Transcript" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

//Thesis Submission
app.post("/thesis_sub-request", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, discipline, batch, joining_date, thesis_date, rollNumber, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();

    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var reciever;
    var spreadsheetId;

    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });
    
    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalThesisRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Thesis Certificate Request") {
            totalThesisRequests += 1;
        }
    }
    var token = `${year}-TCR-${totalThesisRequests + 1}`;

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Thesis Certificate Request", rollNumber,,thesis_date,joining_date,,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Thesis Certificate Request", rollNumber,,thesis_date,joining_date,,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Thesis Certificate Request`,
            text: `Dear ${userName},\n\nThank you for your Thesis Certificate Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Thesis Certificate Request Details:\n\nThesis Certificate Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nThesis Submission Date : ${thesis_date} \nJoining Date : ${joining_date} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Thesis Certificate Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Thesis Certificate Request Details:<br><br><u><b>Thesis Certificate Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Thesis Submission Date : </b> ${thesis_date} <br><b>Joining Date : </b> ${joining_date}<br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Thesis Certificate" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

//Internship
app.post("/internship-request", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, discipline, batch, interndetails, internship_duration, from_date, to_date, rollNumber, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    // const spreadsheetId = "1cALhZnVzsgFqGwDtDUBt8fyp7Ju0jhmXdysMAdyRohw";
    var spreadsheetId;
    var reciever;   
    var handlerName;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];


    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalInternshipRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "NOC for Internship") {
            totalInternshipRequests += 1;
        }
    }
    var token = `${year}-NIR-${totalInternshipRequests + 1}`;

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "NOC for Internship", rollNumber, , , , , interndetails, from_date, to_date, internship_duration, message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "NOC for Internship", rollNumber, , , , , interndetails, from_date, to_date, internship_duration, message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<put admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted NOC for Internship Request`,
            text: `Dear ${userName},\n\nThank you for your NOC for Internship Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your NOC for Internship Request Details:\n\nNOC for Internship Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nInternship Details : ${interndetails} \nFrom : ${from_date} \nTo : ${to_date} \nInternship Duration: ${internship_duration} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your NOC for Internship Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your NOC for Internship Request Details:<br><br><u><b>NOC for Internship Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Internship Details : </b> ${interndetails} <br><b>From : </b> ${from_date} <br><b>To : </b> ${to_date} <br><b>Internship Duration : </b> ${internship_duration}<br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "NOC for Internship" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

app.post("/thesis_def-request", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, discipline, batch, defense_date, joining_date, thesis_date, rollNumber, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var handlerName;
    var spreadsheetId;
    var reciever;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalDefenceRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Thesis Defense Certificate Request") {
            totalDefenceRequests += 1;
        }
    }
    var token = `${year}-TDR-${totalDefenceRequests + 1}`;

    var d = new Date();
    var year = d.getFullYear();

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    // Write row(s) to spreadsheet
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Thesis Defense Certificate Request", rollNumber,defense_date,thesis_date,joining_date,,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Thesis Defense Certificate Request", rollNumber, defense_date, thesis_date, joining_date, , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Thesis Defense Certificate Request", rollNumber,defense_date,thesis_date,joining_date,,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Thesis Defense Certificate Request`,
            text: `Dear ${userName},\n\nThank you for your Thesis Defense Certificate Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Thesis Defense Certificate Request Details:\n\nThesis Defense Certificate Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nThesis Defense Date : ${defense_date} \nThesis Submission Date : ${thesis_date} \nJoining Date : ${joining_date} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Thesis Defense Certificate Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Thesis Defense Certificate Request Details:<br><br><u><b>Thesis Defense Certificate Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Thesis Defense Date : </b> ${defense_date} <br><b>Thesis Submission Date : </b> ${thesis_date} <br><b>Joining Date : </b> ${joining_date}<br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Thesis Defense Certificate" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

app.post("/bonafide-request", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, batch, discipline, rollNumber, graduation_year, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var handlerName;
    var spreadsheetId;
    var reciever;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalBonafideRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Bonafide Request") {
            totalBonafideRequests += 1;
        }
    }
    //var batch = "20" + rollNumber.substring(0, 2);
    var token = `${year}-BR-${totalBonafideRequests + 1}`;

    var d = new Date();
    var year = d.getFullYear();

    //var batch = "20" + rollNumber.substring(0, 2);

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Bonafide Request", rollNumber, , , , graduation_year, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Bonafide Request", rollNumber,,,,graduation_year,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Bonafide Request", rollNumber, , , , graduation_year, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Bonafide Request", rollNumber,,,,graduation_year,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });


        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Bonafide Request`,
            text: `Dear ${userName},\n\nThank you for your Bonafide Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Bonafide Request Details:\n\nBonafide Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nGraduation Year : ${graduation_year} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Bonafide Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Bonafide Request Details:<br><br><u><b>Bonafide Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Graduation Year : </b> ${graduation_year} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Bonafide" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

//Pass/Fail Grade Certificate Request
app.post("/pf_grade-request", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, discipline, batch, rollNumber, joining_year, graduation_year, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var spreadsheetId;
    var reciever;
    var handlerName;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];    
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalPfGradeRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Pass/Fail Certificate Request") {
            totalPfGradeRequests += 1;
        }
    }
    //var batch = "20" + rollNumber.substring(0, 2);
    var token = `${year}-PFCR-${totalPfGradeRequests + 1}`;

    var d = new Date();
    var year = d.getFullYear();
    //var batch = "20" + rollNumber.substring(0, 2);

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range:  `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Pass/Fail Certificate Request", rollNumber, , , joining_year, graduation_year, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Pass/Fail Certificate Request", rollNumber,,,joining_year,graduation_year,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Pass/Fail Certificate Request", rollNumber, , , , , joining_year, graduation_year, , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "Pass/Fail Certificate Request", rollNumber,,,joining_year,graduation_year,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Pass/Fail Grade Certificate Request`,
            text: `Dear ${userName},\n\nThank you for your Pass/Fail Grade Certificate Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Pass/Fail Grade Certificate Request Details:\n\nPass/Fail Grade Certificate Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nJoining Year : ${joining_year} \nGraduation Year : ${graduation_year} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Pass/Fail Grade Certificate Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Pass/Fail Grade Certificate Request Details:<br><br><u><b>Pass/Fail Grade Certificate Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Joining Year : </b> ${joining_year} <br><b>Roll Number : </b> ${rollNumber} <br><b>Graduation Year : </b> ${graduation_year} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Pass/Fail Grade Certificate" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

//Noc For Higher Studies
app.post("/noc_higherstudies-request", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, discipline, rollNumber, batch, joining_year, graduation_year, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var spreadsheetId;
    var reciever;
    var handlerName;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalNocHigherRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "NOC Higher Studies Request") {
            totalNocHigherRequests += 1;
        }
    }
    //var batch = "20" + rollNumber.substring(0, 2);
    var token = `${year}-NHSR-${totalNocHigherRequests + 1}`;

    var d = new Date();
    var year = d.getFullYear();
    //var batch = "20" + rollNumber.substring(0, 2);

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

    // Write row(s) to spreadsheet
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "NOC Higher Studies Request", rollNumber, , , joining_year, graduation_year, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "NOC Higher Studies Request", rollNumber,,,joining_year,graduation_year,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "NOC Higher Studies Request", rollNumber, , , joining_year, graduation_year, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName,, batch, emailID, phoneNumber, programme, discipline, "NOC Higher Studies Request", rollNumber,,,joining_year,graduation_year,message, token, "Pending", currentDate + " | " + time,reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted NOC For Higher Studies Request`,
            text: `Dear ${userName},\n\nThank you for your NOC for Higher Studies Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your NOC for Higher Studies Request Details:\n\nNOC for Higher Studies Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nJoining Year : ${joining_year} \nGraduation Year : ${graduation_year} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your NOC for Higher Studies Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your NOC for Higher Studies Request Details:<br><br><u><b>NOC for Higher Studies Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Joining Year : </b> ${joining_year} <br><b>Roll Number : </b> ${rollNumber} <br><b>Graduation Year : </b> ${graduation_year} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "NOC(Higher Studies)" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

//course completion
app.post("/course_completion-report", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, batch, discipline, rollNumber, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var handlerName;
    var spreadsheetId;
    var reciever;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalCourseCompletionRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Course Completion Report") {
            totalCourseCompletionRequests += 1;
        }
    }
    //var batch = "20" + rollNumber.substring(0, 2);
    var token = `${year}-CCR-${totalCourseCompletionRequests + 1}`;

    var d = new Date();
    var year = d.getFullYear();
    //var batch = "20" + rollNumber.substring(0, 2);

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    // Write row(s) to spreadsheet
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Course Completion Report", rollNumber, , , , , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Course Completion Report", rollNumber,,,,, message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Course Completion Report", rollNumber, , , , , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Course Completion Report", rollNumber,,,,, message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Course Completion Certificate Request`,
            text: `Dear ${userName},\n\nThank you for your Course Completion Certificate Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Course Completion Certificate Request Details:\n\nCourse Completion Certificate Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Course Completion Certificate Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Course Completion Certificate Request Details:<br><br><u><b>Course Completion Certificate Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Course Completion Report" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

//fees receipt
app.post("/fees_receipt-report", async function (req, res) {
    const { userName, rollNumber, phoneNumber, programme, batch, discipline, semester, message, emailID } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var spreadsheetId;
    var reciever;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalFeeReceiptRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Fees Receipt Report") {
            totalFeeReceiptRequests += 1;
        }
    }
    //var batch = "20" + rollNumber.substring(0, 2);
    var token = `${year}-FRR-${totalFeeReceiptRequests + 1}`;

    var d = new Date();
    var year = d.getFullYear();
    //var batch = "20" + rollNumber.substring(0, 2);
    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    // Write row(s) to spreadsheet
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, semester, batch, emailID, phoneNumber, programme, discipline, "Fees Receipt Report", rollNumber, , , , , , , , , message, token, "Pending", currentDate + " | " + time,]],
            values: [[userName,semester, batch, emailID, phoneNumber, programme, discipline, "Fees Receipt Report", rollNumber,,,,, message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, semester, batch, emailID, phoneNumber, programme, discipline, "Fees Receipt Report", rollNumber, , , , , , , , , message, token, "Pending", currentDate + " | " + time,]],
            values: [[userName,semester, batch, emailID, phoneNumber, programme, discipline, "Fees Receipt Report", rollNumber,,,,, message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Fees Receipt Request`,
            text: `Dear ${userName},\n\nThank you for Fees Receipt Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Fees Receipt Request Details:\n\nFees Receipt Request Details\n\nName : ${userName} \nSemester : ${semester} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Fees Receipt Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Fees Receipt Request Details:<br><br><u><b>Fees Receipt Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Semester : </b> ${semester} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                console.log(error);
                res.render("error");
            } else {
                console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Fees Receipt Report" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

// teaching assistant
app.post("/teaching_assistant-report", async function (req, res) {
    const { userName, emailID, phoneNumber, batch, programme, discipline, rollNumber, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var handlerName;
    var spreadsheetId;
    var reciever;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalTARequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Teaching Assistant Report") {
            totalTARequests += 1;
        }
    }
    //var batch = "20" + rollNumber.substring(0, 2);
    var token = `${year}-TAR-${totalTARequests + 1}`;

    var d = new Date();
    var year = d.getFullYear();
    //var batch = "20" + rollNumber.substring(0, 2);

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    // Write row(s) to spreadsheet
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Teaching Assistant Report", rollNumber, , , , , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Teaching Assistant Report", rollNumber, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Teaching Assistant Report", rollNumber, , , , , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Teaching Assistant Report", rollNumber, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Teaching Assistant Certificate Request`,
            text: `Dear ${userName},\n\nThank you for your Teaching Assistant Certificate Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Teaching Assistant Certificate Request Details:\n\nTeaching Assistant Certificate Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Teaching Assistant Certificate Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Teaching Assistant Certificate Request Details:<br><br><u><b>Teaching Assistant Certificate Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                // console.log(error);
                res.render("error");
            } else {
                // console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Teaching Assistant Report" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

//provisional non- PhD
app.post("/provisional_nphd-request", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, discipline, batch, rollNumber, defense_date, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });

    var spreadsheetId;
    var reciever;
    var handlerName;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });
    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalNPHDRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "Provisional Non-PhD Request") {
            totalNPHDRequests += 1;
        }
    }
    //var batch = "20" + rollNumber.substring(0, 2);
    // console.log(batch);
    var token = `${year}-PNR-${totalNPHDRequests + 1}`;
    // console.log(token);

    var d = new Date();
    var year = d.getFullYear();

    //var batch = "20" + rollNumber.substring(0, 2);

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    // Write row(s) to spreadsheet
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Provisional Non-PhD Request", rollNumber, defense_date, , , , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Provisional Non-PhD Request", rollNumber, defense_date, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Provisional Non-PhD Request", rollNumber, defense_date, , , , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "Provisional Non-PhD Request", rollNumber, defense_date, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });
        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted Provisional Certificate (Non - Ph.D.)`,
            text: `Dear ${userName},\n\nThank you for your Provisional Certificate (Non - Ph.D.). The number assigned to your request is ${token}. We will shortly attend to your request. Following is your Provisional Certificate (Non - Ph.D.) Details:\n\nProvisional Certificate (Non - Ph.D.) Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nThesis Defense Date : ${defense_date} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your Provisional Certificate (Non - Ph.D.). The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your Provisional Certificate (Non - Ph.D.) Request Details:<br><br><u><b>Provisional Certificate (Non - Ph.D.) Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Thesis Defense Date : </b> ${defense_date} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                // console.log(error);
                res.render("error");
            } else {
                // console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "Provisional Certificate(Non-Ph.D.)" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

// English Proficiency
app.post("/english_proficiency-request", async function (req, res) {
    const { userName, emailID, phoneNumber, programme, discipline, batch, rollNumber, message } = req.body;

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials2.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    // client instance for authentication
    const client = await auth.getClient();

    // instance of google sheets api
    const googleSheets = google.sheets({
        version: "v4", auth: client
    });
    var handlerName;
    var spreadsheetId;
    var reciever;

    const mappingSheetId = process.env.MAPPING_SHEET;

    const getNewRows = await googleSheets.spreadsheets.values.get({
        auth, spreadsheetId: mappingSheetId, range: "Sheet1!L:N",
    });

    handlerName = getNewRows.data.values[1][0];
    reciever = getNewRows.data.values[1][1];
    spreadsheetId = getNewRows.data.values[1][2];

    // ADDING DATA IN MAIN SHEET
    const getDataRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1",
    });

    var d = new Date();
    var year = d.getFullYear();
    var totalDataRows = getDataRows.data.values.length;

    var totalEnglishRequests = 0;

    for (var i = 0; i < totalDataRows; i++) {
        if (getDataRows.data.values[i][3] == "English Proficiency Request") {
            totalEnglishRequests += 1;
        }
    }
    //var batch = "20" + rollNumber.substring(0, 2);
    // console.log(batch);
    var token = `${year}-EPR-${totalEnglishRequests + 1}`;
    // console.log(token);

    var d = new Date();
    var year = d.getFullYear();
    //var batch = "20" + rollNumber.substring(0, 2);

    var today = new Date();
    var currentDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    // Write row(s) to spreadsheet
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${handlerName}!A:L`,
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "English Proficiency Request", rollNumber, , , , , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "English Proficiency Request", rollNumber, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: mainSheet,
        range: "Sheet1!A:L",
        valueInputOption: "USER_ENTERED",
        resource: {
            // values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "English Proficiency Request", rollNumber, , , , , , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
            values: [[userName, , batch, emailID, phoneNumber, programme, discipline, "English Proficiency Request", rollNumber, , , , , message, token, "Pending", currentDate + " | " + time, , reciever]],
        },
    });

    if (emailID.endsWith("@iitgn.ac.in")) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_ID,
                pass: process.env.PASSWORD
            }
        });

        var mailOptions2 = {
            from: "Academic Office<admin email id>",
            to: emailID,
            cc: process.env.EMAIL_ID,
            bcc: reciever,
            subject: `(${token}) Submitted English Proficiency Request`,
            text: `Dear ${userName},\n\nThank you for your English Proficiency Request. The number assigned to your request is ${token}. We will shortly attend to your request. Following is your English Proficiency Request Details:\n\nEnglish Proficiency Request Details\n\nName : ${userName} \nEmail ID : ${emailID} \nMobile Number : ${phoneNumber} \nProgramme : ${programme} \nDiscipline : ${discipline} \nRoll Number : ${rollNumber} \nMessage : ${message} \n\nRegards\nAcademic Office\nIIT Gandhinagar`,
            html: `<p style="color: black;">Dear <b>${userName}</b>,<br><br><p>Thank you for your English Proficiency Request. The number assigned to your request is <b>${token}</b>. We will shortly attend to your request. Following is your English Proficiency Request Details:<br><br><u><b>English Proficiency Request Details</b></u><br><br><b>Name : </b> ${userName} <br><b>Email ID : </b> ${emailID} <br><b>Mobile Number : </b> ${phoneNumber} <br><b>Programme : </b> ${programme} <br><b>Discipline : </b> ${discipline} <br><b>Roll Number : </b> ${rollNumber} <br><b>Message : </b> ${message}<br><br>Please note that this is an auto-generated email and please do not reply to this email.<br><br>Sincerely,<br>Academic Office</p>`,
        };

        transporter.sendMail(mailOptions2, function (error, info) {
            if (error) {
                // console.log(error);
                res.render("error");
            } else {
                // console.log('Email sent: ' + info.response);
                res.render("success", { token: token, requestType: "English Proficiency Certificate" });
            }
        });
    } else {
        res.render("incorrect_email")
    }
});

app.get('/teaching_assistant-report', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("teaching_assistant", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/english_proficiency-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("english_proficiency", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/course_completion-report', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("course_completion", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/fees_receipt-report', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("fees_receipt", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/transcript-request', checkAuthenticated, (req, res) => {
    console.log("fetching user");
    let user = req.user;
    console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("transcript", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/internship-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("internship", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/bonafide-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("bonafide", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/noc_higherstudies-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("noc_higherstudies", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/pf_grade-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("pf_grade", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/provisional_nphd-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("provisional_nphd", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/provisional_phd-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("provisional_phd", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/thesis_def-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("thesis_def", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/thesis_sub-request', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("thesis_sub", { user: user, error: "" });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/grade-report', checkAuthenticated, (req, res) => {
    let user = req.user;
    // console.log(user);
    if (user.email.includes("@iitgn.ac.in")) {
        res.render("grade", { user: user });
    }
    else {
        res.render("incorrect_email");
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('session-token');
    res.redirect('/')

})

app.listen(process.env.PORT || 3000, function () {
    console.log("Server started on port 3000");
});
