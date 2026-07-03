(function(){'use strict';

function $(id){return document.getElementById(id);} 
const jokeBtn = $('joke-btn');
const jokeText = $('joke-text');
const jokeSource = $('joke-source');
const jokeCopy = $('joke-copy');
if(!jokeBtn || !jokeText) return;

function isTyping(){const el=document.activeElement; if(!el) return false; const tag=el.tagName; if(tag==='INPUT' || tag==='TEXTAREA') return true; if(el.isContentEditable) return true; return false;}

function fetchJSON(url, options){ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(),8000); return fetch(url, Object.assign({signal:controller.signal}, options)).then(res=>{clearTimeout(id); if(!res.ok) throw new Error('HTTP '+res.status); return res.json();}).catch(err=>{clearTimeout(id); throw err;});}

async function getJoke(){
    jokeBtn.disabled = true; jokeBtn.textContent = 'Loading...'; jokeText.textContent = ''; jokeSource.textContent = 'Source: fetching...';
    try{
        const data = await fetchJSON('https://icanhazdadjoke.com/', {headers:{'Accept':'application/json'}});
        if(data && data.joke){ jokeText.textContent = data.joke; jokeSource.textContent = 'Source: icanhazdadjoke.com'; }
        else throw new Error('no-joke');
    }catch(err1){
        try{
            const data = await fetchJSON('https://official-joke-api.appspot.com/random_joke');
            if(data && (data.setup || data.joke)){
                const txt = data.setup ? (data.setup + (data.punchline ? '\n\n' + data.punchline : '')) : data.joke || '';
                jokeText.textContent = txt;
                jokeSource.textContent = 'Source: official-joke-api.appspot.com';
            } else throw new Error('no-joke-2');
        }catch(err2){
            jokeText.textContent = 'Sorry — could not fetch a joke right now. Try again.';
            jokeSource.textContent = 'Source: unavailable';
            console.warn('Joke fetch errors:', err1, err2);
        }
    }
    jokeBtn.disabled = false; jokeBtn.textContent = 'Tell me a joke';
}

jokeBtn.addEventListener('click', getJoke);

jokeCopy.addEventListener('click', async function(){
    const text = (jokeText.textContent || '').trim(); if(!text) return;
    // preferred API
    if(navigator.clipboard && navigator.clipboard.writeText){
        try{ await navigator.clipboard.writeText(text); jokeCopy.textContent = 'Copied!'; setTimeout(()=> jokeCopy.textContent = 'Copy', 1500);}catch(e){ fallbackCopy(text); }
    } else { fallbackCopy(text); }
});

function fallbackCopy(text){ try{ const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); jokeCopy.textContent = 'Copied!'; setTimeout(()=> jokeCopy.textContent = 'Copy',1500); }catch(e){ console.warn('copy failed', e); } }

// keyboard shortcut: press 'j' to fetch a new joke when not typing
window.addEventListener('keydown', function(e){ if((e.key === 'j' || e.key === 'J') && !isTyping()) { e.preventDefault(); getJoke(); }});

// expose for testing
window.getJoke = getJoke;

})();