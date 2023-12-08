document.getElementById("rollNumber").addEventListener("keyup", function (e) {
  var lengthOfNumber = e.currentTarget.value.length;
  var rollNumber = document.getElementById("rollNumber").value;
  var rollValue = String(rollNumber);
  var phoneNumber = document.getElementById("phoneNumber").value;
  if (
    lengthOfNumber != 8 ||
    rollValue.startsWith("21") == false ||
    rollValue.startsWith("20") == false ||
    rollValue.startsWith("19") == false ||
    rollValue.startsWith("18") == false ||
    rollValue.startsWith("17") == false ||
    rollValue.startsWith("16") == false ||
    rollValue.startsWith("15") == false ||
    rollValue.startsWith("14") == false ||
    rollValue.startsWith("13") == false
  ) {
    if (
      rollValue.startsWith("21") == false ||
      rollValue.startsWith("20") == false ||
      rollValue.startsWith("19") == false ||
      rollValue.startsWith("18") == false ||
      rollValue.startsWith("17") == false ||
      rollValue.startsWith("16") == false ||
      rollValue.startsWith("15") == false ||
      rollValue.startsWith("14") == false ||
      rollValue.startsWith("13") == false
    ) {
      document.getElementById("year").innerHTML = "Incorrect Roll Number";
    }
    if (lengthOfNumber != 8) {
      document.getElementById("roll").innerHTML =
        "Roll Number must be 8 digits";
    }
    document.getElementById("submit").disabled = true;
  } else if (
    lengthOfNumber == 8 ||
    rollValue.startsWith("21") == true ||
    rollValue.startsWith("20") == true ||
    rollValue.startsWith("19") == true ||
    rollValue.startsWith("18") == true ||
    rollValue.startsWith("17") == true ||
    rollValue.startsWith("16") == true ||
    rollValue.startsWith("15") == true ||
    rollValue.startsWith("14") == true ||
    rollValue.startsWith("13") == true ||
    phoneNumber.length != 10
  ) {
    if (
      rollValue.startsWith("21") == true ||
      rollValue.startsWith("20") == true ||
      rollValue.startsWith("19") == true ||
      rollValue.startsWith("18") == true ||
      rollValue.startsWith("17") == true ||
      rollValue.startsWith("16") == true ||
      rollValue.startsWith("15") == true ||
      rollValue.startsWith("14") == true ||
      rollValue.startsWith("13") == true
    ) {
      document.getElementById("year").innerHTML = "";
    }
    if (lengthOfNumber == 8) {
      document.getElementById("roll").innerHTML = "";
    }
    document.getElementById("submit").disabled = true;
  }

  if (
    lengthOfNumber == 8 ||
    rollValue.startsWith("21") == true ||
    rollValue.startsWith("20") == true ||
    rollValue.startsWith("19") == true ||
    rollValue.startsWith("18") == true ||
    rollValue.startsWith("17") == true ||
    rollValue.startsWith("16") == true ||
    rollValue.startsWith("15") == true ||
    rollValue.startsWith("14") == true ||
    (rollValue.startsWith("13") == true && phoneNumber.length == 10)
  ) {
    if (
      rollValue.startsWith("21") == true ||
      rollValue.startsWith("20") == true ||
      rollValue.startsWith("19") == true ||
      rollValue.startsWith("18") == true ||
      rollValue.startsWith("17") == true ||
      rollValue.startsWith("16") == true ||
      rollValue.startsWith("15") == true ||
      rollValue.startsWith("14") == true ||
      rollValue.startsWith("13") == true
    ) {
      document.getElementById("year").innerHTML = "";
    }
    if (lengthOfNumber == 8) {
      document.getElementById("roll").innerHTML = "";
    }
    if (
      lengthOfNumber == 8 &&
      phoneNumber.length == 10 &&
      (rollValue.startsWith("21") == true ||
        rollValue.startsWith("20") == true ||
        rollValue.startsWith("19") == true ||
        rollValue.startsWith("18") == true ||
        rollValue.startsWith("17") == true ||
        rollValue.startsWith("16") == true ||
        rollValue.startsWith("15") == true ||
        rollValue.startsWith("14") == true ||
        rollValue.startsWith("13") == true)
    ) {
      document.getElementById("submit").disabled = false;
    }
  }
});
