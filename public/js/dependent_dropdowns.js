var subjectObject = {
  "B.Sc. in Engineering": [
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Science and Engineering",
    "Electrical Engineering",
    "Materials Engineering",
    "Mechanical Engineering",
  ],
  "B.Tech.": [
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Science and Engineering",
    "Electrical Engineering",
    "Materials Engineering",
    "Mechanical Engineering",
  ],
  "B.Tech. - M.Sc. Dual Degree": [
    "Chemistry",
    "Cognitive Science",
    "Mathematics",
    "Physics",
  ],
  "B.Tech. - M.Tech. Dual Degree": [
    "Biological Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Science and Engineering",
    "Electrical Engineering",
    "Materials Engineering",
    "Mechanical Engineering",
  ],
  "Double Master’s Degree program": [
    "Biological Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Science and Engineering",
    "Electrical Engineering",
    "Materials Engineering",
    "Mechanical Engineering",
  ],
  "M.A.": ["Society and Culture"],
  "M.Sc.": ["Chemistry", "Cognitive Science", "Mathematics", "Physics"],
  "M.Tech.": [
    "Biological Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Science and Engineering",
    "Earth System Science",
    "Electrical Engineering",
    "Materials Engineering",
    "Mechanical Engineering",
  ],
  PGDIIT: [
    "Biological Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Science and Engineering",
    "Earth System Science",
    "Electrical Engineering",
    "Materials Engineering",
    "Mechanical Engineering",
  ],
  "Ph.D.": [
    "Biological Engineering",
    "Chemical Engineering",
    "Chemistry",
    "Civil Engineering",
    "Cognitive Science",
    "Computer Science and Engineering",
    "Earth Sciences",
    "Electrical Engineering",
    "Humanities and Social Sciences",
    "Materials Engineering",
    "Mechanical Engineering",
    "Mathematics",
    "Physics",
  ],
};

window.onload = function () {
  var subjectSel = document.getElementById("programme");
  var topicSel = document.getElementById("discipline");
  for (var x in subjectObject) {
    subjectSel.options[subjectSel.options.length] = new Option(x, x);
  }
  subjectSel.onchange = function () {
    topicSel.length = 1;
    for (var y in subjectObject[this.value]) {
      z = subjectObject[this.value].length;
      var newValue = subjectObject[this.value][y];
      topicSel.options[topicSel.options.length] = new Option(
        newValue,
        newValue
      );
    }
  };
};
