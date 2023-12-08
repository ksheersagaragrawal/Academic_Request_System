function myFunction() {
    var input, filter, ul, li, a, i, txtValue,x;
    input = document.getElementById("myInput");
    filter = input.value.toUpperCase();
    ul = document.getElementById("myUL");
    li = ul.getElementsByTagName("li");
    
 
    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        var x = document.activeElement.tagName;
        setInterval("myFunction()", 1); 
         if ((txtValue.toUpperCase().indexOf(filter) > -1)&(input.value.length !== 0)&(x==="INPUT"|x==='A')){
            ul.style.visibility = 'visible'; 
            li[i].style.display = "";
        } 
        
        else {
            
            li[i].style.display = "none";
        }
    }
};