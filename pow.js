window.finished = true;
window.threshold = '0xFFFFFE00';


window.stopWebGL = async () => {
    window.finished = true;
}

window.startNewRace = async () => {
    window.startWebGL();
}

window.calcuatePow = async () => {
  if(!finished) {
    return;
  }
  finished = false;
  window.startWebGL();
}

window.startWebGL = async () => {
    const startMs = Date.now();
    const hash = document.getElementById('previous').innerText;
    document.getElementById('workStatus').innerText = 'Started Get Work.';  
    window.nanoWebglPow(hash,
        (workValue, n) => {
          stopRace();
          const ms = Date.now() - startMs;
          callback(workValue, ms);
        },
        (n) => {
          if (finished) {
            const ms = Date.now() - startMs;
            callback(null, ms);
            return true;
          } else {
            document.getElementById('workStatus').innerText = 'Calculated ' + n + ' frames...';
            return false;
          }
        },
        threshold,
    );
};

window.callback = (workValue, ms) => {
    // console.log('callback', workValue, ms);
    if (workValue !== null) {
      console.log('callback', workValue, ms);
      document.getElementById('work').innerText = workValue;
      document.getElementById('workStatus').innerText = ' Get Work Complete.';  
    }
  };

  window.stopRace = () => {
    finished = true;
  };
  

  window.delay = (time) => {
  if (!isNaN(time)) {
    if (isFinite(time)) {
      return new Promise((resolve) => {
        const fn = () => {
          resolve();
        };
        setTimeout(fn, time);
      });
    }
  }
};

window.bytesToHex = (bytes) => {
  return Array.prototype.map
      .call(bytes, (x) => ('00' + x.toString(16)).slice(-2))
      .join('')
      .toUpperCase();
};
