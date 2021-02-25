var maindiv = document.getElementById("maindiv"); 
var innercode = maindiv.innerHTML;

links = [ "https://sinecraft.net", "https://soundcloud.com/amimifafa", "https://github.com/anakrusis", "https://twitter.com/amimifafa", "https://battleofthebits.org/barracks/Profile/amelia/" ];

linktexts = [ "👈 sinecraft home", "🎧 sound cloud", "🖥️ git hub", "🐤 twitter", "🏆 battle of bit" ];

innercode+="<div class=\"titlebar\"><a href=\"index.html\"><img src=\"pog land.png\"></a></div>"
innercode+="<table><tr>"

for (i = 0; i < 5; i++) {
	innercode+="<th><div class = \"linkdiv\">"
	innercode+="<a href=\"" + links[i] + "\">"
	innercode+=linktexts[i] + "</a>"
	innercode+="</div></th>"
}
innercode+="</table></tr>"

maindiv.innerHTML = innercode;
