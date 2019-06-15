/**
 * Calculates the specificity of CSS selectors
 * http://www.w3.org/TR/css3-selectors/#specificity
 *
 * Returns an array of objects with the following properties:
 *  - selector: the input
 *  - specificity: e.g. 0,1,0,0
 *  - parts: array with details about each part of the selector that counts towards the specificity
 */
var SPECIFICITY = (function() {
	var calculate,
		calculateSingle;

	calculate = function(input) {
		var selectors,
			selector,
			i,
			len,
			results = [];

		// Separate input by commas
		selectors = input.split(',');

		for (i = 0, len = selectors.length; i < len; i += 1) {
			selector = selectors[i];
			if (selector.length > 0) {
				results.push(calculateSingle(selector));
			}
		}

		return results;
	};

	// Calculate the specificity for a selector by dividing it into simple selectors and counting them
	calculateSingle = function(input) {
		var selector = input,
			findMatch,
			typeCount = {
				'a': 0,
				'b': 0,
				'c': 0
			},
			parts = [],
			// The following regular expressions assume that selectors matching the preceding regular expressions have been removed
			attributeRegex = /(\[[^\]]+\])/g,
			idRegex = /(#[^\s\+>~\.\[:]+)/g,
			classRegex = /(\.[^\s\+>~\.\[:]+)/g,
			pseudoElementRegex = /(::[^\s\+>~\.\[:]+|:first-line|:first-letter|:before|:after)/gi,
			// A regex for pseudo classes with brackets - :nth-child(), :nth-last-child(), :nth-of-type(), :nth-last-type(), :lang()
			pseudoClassWithBracketsRegex = /(:[\w-]+\([^\)]*\))/gi,
			// A regex for other pseudo classes, which don't have brackets
			pseudoClassRegex = /(:[^\s\+>~\.\[:]+)/g,
			elementRegex = /([^\s\+>~\.\[:]+)/g;

		// Find matches for a regular expression in a string and push their details to parts
		// Type is "a" for IDs, "b" for classes, attributes and pseudo-classes and "c" for elements and pseudo-elements
		findMatch = function(regex, type) {
			var matches, i, len, match, index, length;
			if (regex.test(selector)) {
				matches = selector.match(regex);
				for (i = 0, len = matches.length; i < len; i += 1) {
					typeCount[type] += 1;
					match = matches[i];
					index = selector.indexOf(match);
					length = match.length;
					parts.push({
						selector: match,
						type: type,
						index: index,
						length: length
					});
					// Replace this simple selector with whitespace so it won't be counted in further simple selectors
					selector = selector.replace(match, Array(length + 1).join(' '));
				}
			}
		};

		// Remove the negation psuedo-class (:not) but leave its argument because specificity is calculated on its argument
		(function() {
			var regex = /:not\(([^\)]*)\)/g;
			if (regex.test(selector)) {
				selector = selector.replace(regex, '     $1 ');
			}
		}());

		// Remove anything after a left brace in case a user has pasted in a rule, not just a selector
		(function() {
			var regex = /{[^]*/gm,
				matches, i, len, match;
			if (regex.test(selector)) {
				matches = selector.match(regex);
				for (i = 0, len = matches.length; i < len; i += 1) {
					match = matches[i];
					selector = selector.replace(match, Array(match.length + 1).join(' '));
				}
			}
		}());

		// Add attribute selectors to parts collection (type b)
		findMatch(attributeRegex, 'b');

		// Add ID selectors to parts collection (type a)
		findMatch(idRegex, 'a');

		// Add class selectors to parts collection (type b)
		findMatch(classRegex, 'b');

		// Add pseudo-element selectors to parts collection (type c)
		findMatch(pseudoElementRegex, 'c');

		// Add pseudo-class selectors to parts collection (type b)
		findMatch(pseudoClassWithBracketsRegex, 'b');
		findMatch(pseudoClassRegex, 'b');

		// Remove universal selector and separator characters
		selector = selector.replace(/[\*\s\+>~]/g, ' ');

		// Remove any stray dots or hashes which aren't attached to words
		// These may be present if the user is live-editing this selector
		selector = selector.replace(/[#\.]/g, ' ');

		// The only things left should be element selectors (type c)
		findMatch(elementRegex, 'c');

		// Order the parts in the order they appear in the original selector
		// This is neater for external apps to deal with
		parts.sort(function(a, b) {
			return a.index - b.index;
		});

		return {
			selector: input,
			specificity: '0,' + typeCount.a.toString() + ',' + typeCount.b.toString() + ',' + typeCount.c.toString(),
			parts: parts
		};
	};

	return {
		calculate: calculate
	};
}());

// Export for Node JS
if (typeof exports !== 'undefined') {
	exports.calculate = SPECIFICITY.calculate;
}






$(document).ready(function() {

	var $items = $('#items'),
		$baseItem = $items.find('.item:eq(0)').clone(),
		$sort = $('.sort'),
		$offscreen = $('#offscreen'),
		update,
		createItem;

	createItem = function(selector, $prev) {
		var $item = $baseItem.clone(),
			$input = $item.find('> .input').val(selector),
			$selector = $item.find('> .selector'),
			$specificityZ = $item.find('> .specificity > .type-z'),
			$specificityA = $item.find('> .specificity > .type-a'),
			$specificityB = $item.find('> .specificity > .type-b'),
			$specificityC = $item.find('> .specificity > .type-c'),
			$duplicate = $item.find('> .duplicate'),
			update;

		update = function(e) {
			var input = $input.val(),
				result,
				specificity,
				highlightedSelector,
				i, len, part, text1, text2, text3;

			// Resize the textarea to fit contents
			(function() {
				var $temp = $('<div class="selector"></div>'),
					lastChar = input.substr(input.length-1),
					height;

				if (lastChar === '\n' || lastChar === '\r') {
					$temp.text(input + ' ');
					console.log('tes');
				} else {
					$temp.text(input);
				}
				$offscreen.append($temp);
				height = $temp.height();
				$temp.remove();
				$input.height(height + 'px');
				$selector.height(height + 'px');
			}());

			result = SPECIFICITY.calculate(input);

			if (result.length === 0) {
				$selector.text(' ');
				$specificityZ.text('0');
				$specificityA.text('0');
				$specificityB.text('0');
				$specificityC.text('0');
				return;
			}

			result = result[0];
			specificity = result.specificity.split(',');
			$specificityZ.text(specificity[0]);
			$specificityA.text(specificity[1]);
			$specificityB.text(specificity[2]);
			$specificityC.text(specificity[3]);

			highlightedSelector = result.selector;
			for (i = result.parts.length - 1; i >= 0; i -= 1) {
				part = result.parts[i];
				text1 = highlightedSelector.substring(0, part.index);
				text2 = highlightedSelector.substring(part.index, part.index + part.length);
				text3 = highlightedSelector.substring(part.index + part.length);
				highlightedSelector = text1 + '<span class="type-' + part.type + '">' + text2 + '</span>' + text3;
			}
			$selector.html(highlightedSelector);
		};

		$duplicate.click(function(e) {
			e.preventDefault();
			createItem($input.val(), $item);
		});

		$input.keyup(update);
		update();
		if ($prev) {
			$prev.after($item);
		} else {
			$items.append($item);
		}
		setTimeout(function() {
			$item.removeClass('is-small');
		}, 100);
	};

	$items.empty();
  if (window.location.hash) { 
     var thehash = window.location.hash;
     thehash = thehash.slice(1);
     //thehash = thehash.replace(/##/g, '');
     //thehash = thehash.replace(/#/g, '');
     thehash = thehash.replace(/-/g, ' ');
     createItem(thehash);
  } else {
	  createItem('li:first-child h2 .title');
	  createItem('#nav .selected > a:hover');    
  }

	$sort.click(function(e) {
		e.preventDefault();

		var $children = $items.children(),
			children = $children.get(),
			yPos = 0;

		$items.height($items.height());
		$children.each(function(index, el) {
			var $this = $(this);
			$this.removeClass('transition-all').css({
				'position': 'absolute',
				'top': yPos + 'px',
				'left': '0'
			});
			yPos += $this.outerHeight(true);
		});

		children.sort(function(sel1, sel2) {
			var spec1 = [],
				spec2 = [],
				i;

			spec1[0] = parseInt($('.specificity .type-z', sel1).text(), 10),
			spec1[1] = parseInt($('.specificity .type-a', sel1).text(), 10),
			spec1[2] = parseInt($('.specificity .type-b', sel1).text(), 10),
			spec1[3] = parseInt($('.specificity .type-c', sel1).text(), 10),
			spec2[0] = parseInt($('.specificity .type-z', sel2).text(), 10),
			spec2[1] = parseInt($('.specificity .type-a', sel2).text(), 10),
			spec2[2] = parseInt($('.specificity .type-b', sel2).text(), 10),
			spec2[3] = parseInt($('.specificity .type-c', sel2).text(), 10);

			for (i = 0; i < 4; i += 1) {
				if (spec1[i] > spec2[i]) {
					return -1;
				} else if (spec2[i] > spec1[i]) {
					return 1;
				}
			}

			return 0;
		});

		setTimeout(function() {
			var yPos = 0;

			$.each(children, function(index, el) {
				var $el = $(el);
				$el.addClass('transition-all').css({
					'top': yPos + 'px'
				});
				yPos += $el.outerHeight(true);
			});

			setTimeout(function() {
				$.each(children, function(index, el) {
					$(el).removeClass('transition-all').css({
						'position': 'relative',
						'top': '0',
						'left': '0'
					});
					$items.append(el);
					$items.height('auto');
				});
			}, 500);
		}, 50);
	});
  


});
