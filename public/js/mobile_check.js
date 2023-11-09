document.getElementById("phoneNumber").addEventListener("keyup", function (e) {
  var lengthOfNumber = e.currentTarget.value.length;
  var rollNumber = document.getElementById("rollNumber").value;
  var year = document.getElementById("year").innerHTML;
  if (
    lengthOfNumber != 10 ||
    rollNumber.length != 8 ||
    year == "Incorrect Roll Number"
  ) {
    if (lengthOfNumber != 10) {
      document.getElementById("phone").innerHTML =
        "Phone Number must be 10 digits";
    } else {
      document.getElementById("phone").innerHTML = "";
    }
    document.getElementById("submit").disabled = true;
  }
  if (
    lengthOfNumber == 10 ||
    rollNumber.length != 8 ||
    year == "Incorrect Roll Number"
  ) {
    document.getElementById("submit").disabled = true;
  }
  if (
    lengthOfNumber == 10 &&
    rollNumber.length == 8 &&
    year != "Incorrect Roll Number"
  ) {
    document.getElementById("phone").innerHTML = "";
    document.getElementById("rollNumber").innerHTML = "";
    document.getElementById("submit").disabled = false;
  }
});
