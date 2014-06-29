$("[id^=f]").keydown(function (event) {
    if (event.keyCode >= 37 && event.keyCode <= 40) {
        g = true;
        
        if (event.keyCode % 2 && !this.readOnly) {
            // left or right
            if (this.value.length > 0) {
                if (event.keyCode === 37 && this.selectionEnd > 0) { // left
                    g = false;
                }
                    
                if (event.keyCode === 39 && this.selectionStart < this.value.length) { // right
                    g = false;
                }
            }
        }
        
        if (g) {
            x=parseInt(this.id.charAt(1));
            y=parseInt(this.id.charAt(2));
            
            for (r=1; r<9; r++) {
                if (event.keyCode === 37) {
                    x = (x - 1) % 9;
                } else if (event.keyCode === 38) {
                    y = (y - 1) % 9;
                } else if (event.keyCode === 39) {
                    x = (x + 1) % 9;
                } else if (event.keyCode === 40) {
                    y = (y + 1) % 9;
                }
                
                n=document.getElementById('f'+x+y);
                
                if (n) {
                    n.select();
                    if (n.readOnly) {
                        if (n.setSelectionRange) {
                            n.focus();
                            n.setSelectionRange(0, 1);
                            window.setTimeout(function() { n.select(); }, 1); // for Safari/Chrome
                        }
                    }
                }       
            
                if (window.event) {
                    window.event.cancelBubble=true; 
                }

                if (event.stopPropagation)
                    event.stopPropagation();
                    
                break;
            }
        }
    }
});


