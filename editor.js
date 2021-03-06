String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};

function loadExample()
{
	var query = '"Systems Biology"[mesh] OR ("Computer Simulation"[majr] AND "Models, Biological"[majr]) AND ("whole-cell" OR "cell simulation") AND (bacteria OR virus)';
	var el = document.getElementById("rawquery");
	parse_pubmed_query(query, el);
	document.getElementById("rawquery").value = query;
	refreshPubmed();
}

function queryFromHTML(html)
{
	html = html.replace(/<(?:.|\n)*?>/gm,' ')
		.replace(/\\n/," ")
		.replace(/\\r/," ")
		.replace(/&nbsp;/g," ")
		.replace(/\s{2,}/g, ' ')
		.replace(/^\s+/,'')
		.replace(/\s+$/,'');
	// return html;
	return removeUneededSpaces(html);
}

function removeUneededSpaces(query)
{
	// return query.replace(/•/g, "")
	return	query.replace(/(["|\[|\]|\(|\)])(\s?)(["|\[|\]|\(|\)])/gi, "$1$3")
				.replace(/\(\s+/g, "(")
				.replace(/\s+\)/g, ")")
				.replace(/\s+\[/g, "[")
				.replace(/\s?\*\s?/g, "* ");
}

function parse_pubmed_query(query, element) 
{	
	query = query.trim();
	console.log(query);
	var html = "<span class='word'>" + query;
	// | = cursor!
	html = html.replace(/(\s+)(\|?\bO\|?R\b\|?)(\s+)/gi, "$1</span><div class='operator'>$2</div><span class='word'>$3"); // OR
	html = html.replace(/(\s+)(\|?\bA\|?N\|?D\b\|?)(\s+)/gi, "$1</span><div class='operator'>$2</div><span class='word'>$3"); // AND
	html = html.replace(/(\s+)(\|?\bN\|?O\|?T\b\|?)(\s+)/gi, "$1</span><div class='operator'>$2</div><span class='word'>$3"); // NOT

	html = html.replace(/\[/gi, "</span><span class='tag'>[");
	html = html.replace(/\]/gi, "]</span><span class='word'>");
	
	html = html.replace(/\*/gi, "</span><span class='expand'>*<span class='word'>");
	
	html = html.replace(/\s*\(/gi, "</span><div class='levelup'>(<div class='secondlevel'><span class='word'>");
	html = html.replace(/\)\s*/gi, "</span><br/></div>)</div><span class='word'>");
	
	html = html + "</span>";
	html = html.replace(/<span class='word'><\/span>/g, "");
	html = html.replace(/<br\/>/g, "");
	
	// make sure that there is always <br/> on the end of div.
	if(html.indexOf("<span class='word'>|</span>") != html.length - "<span class='word'>|</span>".length) html += "<br/>";
	html = html.replace("<span class='word'>|</span>", "<span class='word'>|<br/></span>");	
	
	element.innerHTML = html;
	searchForWordsWithoutQoutes();
}

function searchForWordsWithoutQoutes()
{
	var nl = document.getElementById("query").getElementsByClassName('word');  
	var words = [];
	for(var i = nl.length; i--; words.unshift(nl[i])); // convert to array
	var word = words.pop()
	while(word)
	{
		var text = word.textContent.replace("|","").trim();
		
		var firstChar = text.charAt(0);
		var lastChar = text.charAt(text.length-1);
		
		if(lastChar == "|") lastChar = text.charAt(text.length-2);
		if(firstChar == "|") firstChar = text.charAt(1);
				
		if(text.indexOf(' ') != -1 && 
		  !((firstChar == '"' && lastChar == '"') || 
		  (firstChar == '\'' && lastChar == '\'')))
		{
			word.className = 'noqoutes';
		}
		word = words.pop();
	}
	
}

function rawQueryFromText(query)
{
	return query.replace("|","")
				.replace(/(\S\s?)(\bOR\b\|?)(\s?\S)/gi, "$1OR$3") // OR
				.replace(/(\S\s?)(\bAND\b\|?)(\s?\S)/gi, "$1AND$3") // AND
				.replace(/(\S\s?)(\bNOT\b\|?)(\s?\S)/gi, "$1NOT$3"); // NOT
}

function searchElForString(el, needle)
{
	var child = el.firstChild;
	while(child)
	{
		var index = child.textContent.indexOf(needle);
		if(index > -1)
		{
			if(child.firstChild) return searchElForString(child, needle);
			else return new Array(child, index);
		}
		child = child.nextSibling;
	}
}

var prevQuery = "";

function markup(e) 
{
	var letter = e.which;
	
	if(letter == 37 || letter == 38 || letter == 39 || letter == 40) return;

	var selection = rangy.getSelection();
	if ((selection.rangeCount == 0 || !rangy.getSelection().isCollapsed) && letter != 8) return;
	var range = selection.getRangeAt(0);

	var rawQueryEl = document.getElementById("rawquery");
	var queryEl = document.getElementById("query");
	var text = queryFromHTML(queryEl.innerHTML);
	if(letter == 13)
	{
		rawQueryEl.value = rawQueryFromText(text);
		searchPubmed(text);
	} 
	if(text == prevQuery && letter != 13 && letter != 8) return;	
	prevQuery = text;

	// add | token
	var cursor = document.createTextNode("|");
	range.insertNode(cursor);
	range.setStartAfter(cursor);
	range.setEndAfter(cursor);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
	
	text = queryFromHTML(queryEl.innerHTML);
	// parse
	parse_pubmed_query(text, queryEl); 
	
	rawQueryEl.value = rawQueryFromText(text);
	
	var arr = searchElForString(queryEl, "|");	
	if(!arr[0]) return;
	arr[0].data = arr[0].data.replace("|", "");

	var newRange = rangy.createRange();
	newRange.setStart(arr[0], arr[1]);	
	newRange.collapse(true);
	var sel = rangy.getSelection();
	sel.setSingleRange(newRange);
	
	if(queryEl.textContent.length < 2)
	{
		searchPubmed("");
		queryEl.focus();
	}
}

// use br instead of div div
function insertBR(e) 
{
	if (e.which == 13 || e.which == 124) 
	{
		if (rangy.getSelection()) 
		{
			var selection = rangy.getSelection();
			var range = selection.getRangeAt(0);
			range.deleteContents();
			range.collapse(false);
			selection.removeAllRanges();
			selection.addRange(range);
			return false;
		}
	}
}

function cancelReturn(e) 
{
	if (e.which == 13) 
	{
		e.preventDefault();
		refreshPubmed();
		return false;
	}
}