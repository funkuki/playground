// 影片播放：自動靜音循環；點畫面暫停／繼續。瀏覽器擋自動播放時顯示播放鍵。
const video = document.getElementById('film');
const play = document.getElementById('play');

const sync = () => play.classList.toggle('show', video.paused);
video.addEventListener('play', sync);
video.addEventListener('pause', sync);
video.play().catch(sync);

const toggle = () => (video.paused ? video.play() : video.pause());
video.addEventListener('click', toggle);
play.addEventListener('click', toggle);
addEventListener('keydown', (e) => {
  if (e.key === ' ' && !document.getElementById('info').classList.contains('open') && !e.target.closest('a, button')) {
    e.preventDefault();
    toggle();
  }
});
