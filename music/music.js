document.addEventListener("DOMContentLoaded", function () {

    if (typeof songs === "undefined") {
        console.error("songs.js did not load, nothing to play");
        return;
    }

    // elements 
    const audio = document.getElementById("audio");
    const seekbar = document.getElementById("seekbar");
    const volume = document.getElementById("volume");
    const player = document.getElementById("player");
    const thumbnail = document.getElementById("thumbnail");
    const cover = document.getElementById("cover");
    const playertitle = document.getElementById("playertitle");
    const playerartist = document.getElementById("playerartist");
    const playbutton = document.getElementById("playbutton");
    const previousbutton = document.getElementById("previousbutton");
    const nextbutton = document.getElementById("nextbutton");
    const likebutton = document.getElementById("likebutton");
    const savebutton = document.getElementById("savebutton");
    const currenttime = document.getElementById("currenttime");
    const totaltime = document.getElementById("totaltime");
    const musicgrid = document.getElementById("musicgrid");
    const title = document.getElementById("title");
    const queuelist = document.getElementById("queuelist");
    const queuecount = document.getElementById("queuecount");
    const navbuttons = document.querySelectorAll(".navbutton");

    // saved stuff (localStorage)
    function loadList(key) {
        try {
            const saved = JSON.parse(localStorage.getItem(key));
            return Array.isArray(saved) ? saved : [];
        } catch (err) {
            return [];
        }
    }

    function saveList(key, list) {
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch (err) {

        }
    }

    let library = loadList("riff_library");
    let liked = loadList("riff_liked");
    let playHistory = loadList("riff_history");

    // state 
    let currentTab = "catalog";
    let currentList = songs;
    let currentIndex = -1;
    let errorCount = 0;

    const tabTitles = {
        catalog: "Dashboard",
        library: "Library",
        history: "History",
        like: "Liked Songs"
    };

    const emptyText = {
        catalog: "No songs found.",
        library: "Your library is empty. Play a song and hit + to add it.",
        history: "Nothing played yet.",
        like: "No liked songs yet."
    };

    function getSong(id) {
        return songs.find(function (song) {
            return song.id === id;
        });
    }

    function songsForTab(tab) {
        if (tab === "library") return library.map(getSong).filter(Boolean);
        if (tab === "history") return playHistory.map(getSong).filter(Boolean);
        if (tab === "like") return liked.map(getSong).filter(Boolean);
        return songs;
    }

    function formatTime(seconds) {
        if (!isFinite(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ":" + (secs < 10 ? "0" : "") + secs;
    }

    function setIcon(button, name) {
        button.innerHTML = '<i data-lucide="' + name + '"></i>';
        lucide.createIcons();
    }

    function toggleInList(list, id) {
        const spot = list.indexOf(id);
        if (spot === -1) {
            list.push(id);
        } else {
            list.splice(spot, 1);
        }
    }

    function currentSong() {
        return currentIndex >= 0 ? currentList[currentIndex] : null;
    }

    // dashboard 
    function makeCard(song) {
        const card = document.createElement("div");
        card.className = "musiccard";
        card.dataset.id = song.id;

        const img = document.createElement("img");
        img.className = "cardcover";
        img.src = song.cover;
        img.alt = song.title + " cover";

        const name = document.createElement("h4");
        name.className = "cardtitle";
        name.textContent = song.title;

        const artist = document.createElement("p");
        artist.className = "cardartist";
        artist.textContent = song.artist;

        card.append(img, name, artist);
        return card;
    }

    function showTab(tab) {
        currentTab = tab;

        navbuttons.forEach(function (btn) {
            btn.classList.toggle("active", btn.dataset.tab === tab);
        });

        title.textContent = tabTitles[tab];
        musicgrid.innerHTML = "";

        const list = songsForTab(tab);

        if (list.length === 0) {
            const empty = document.createElement("p");
            empty.className = "emptymessage";
            empty.textContent = emptyText[tab];
            musicgrid.appendChild(empty);
            return;
        }

        list.forEach(function (song, i) {
            const card = makeCard(song);
            card.addEventListener("click", function () {
                playFrom(list, i);
            });
            musicgrid.appendChild(card);
        });

        highlightPlaying();
    }

    function highlightPlaying() {
        const song = currentSong();
        document.querySelectorAll(".musiccard").forEach(function (card) {
            card.classList.toggle("playing", !!song && Number(card.dataset.id) === song.id);
        });
    }

    //queue 
    function renderQueue() {
        queuelist.innerHTML = "";

        const upcoming = currentIndex >= 0 ? currentList.slice(currentIndex + 1) : [];
        queuecount.textContent = upcoming.length + (upcoming.length === 1 ? " item" : " items");

        if (upcoming.length === 0) {
            const empty = document.createElement("p");
            empty.className = "emptymessage";
            empty.textContent = "Nothing up next.";
            queuelist.appendChild(empty);
            return;
        }

        upcoming.forEach(function (song, i) {
            const item = document.createElement("div");
            item.className = "queueitem";

            const name = document.createElement("span");
            name.className = "queuetitle";
            name.textContent = song.title;

            const artist = document.createElement("small");
            artist.className = "queueartist";
            artist.textContent = song.artist;

            item.append(name, artist);
            item.addEventListener("click", function () {
                playFrom(currentList, currentIndex + 1 + i);
            });
            queuelist.appendChild(item);
        });
    }

    function playFrom(list, index) {
        currentList = list;
        currentIndex = index;
        loadSong();
    }

    function loadSong() {
        const song = currentSong();
        if (!song) return;

        audio.src = song.file;
        cover.src = song.cover;
        cover.alt = song.title + " cover";
        playertitle.textContent = song.title;
        playerartist.textContent = song.artist;
        player.classList.remove("hiddenplayer");

        seekbar.value = 0;
        currenttime.textContent = "0:00";
        totaltime.textContent = "0:00";

        const started = audio.play();
        if (started !== undefined) {
            started.catch(function (err) {

                if (err.name !== "AbortError") console.error("play failed:", err);
            });
        }

        addToHistory(song.id);
        updateSideButtons();
        renderQueue();
        highlightPlaying();
    }

    function addToHistory(id) {
        const spot = playHistory.indexOf(id);
        if (spot !== -1) playHistory.splice(spot, 1);
        playHistory.unshift(id);
        if (playHistory.length > 50) playHistory.pop();
        saveList("riff_history", playHistory);
    }

    function playNext() {
        if (currentIndex < 0) return;

        currentIndex = (currentIndex + 1) % currentList.length;
        loadSong();
    }

    function playPrevious() {
        if (currentIndex < 0) return;

        if (audio.currentTime > 3 || currentIndex === 0) {
            audio.currentTime = 0;
            return;
        }
        currentIndex--;
        loadSong();
    }

    function updateSideButtons() {
        const song = currentSong();
        const isLiked = !!song && liked.includes(song.id);
        const isSaved = !!song && library.includes(song.id);

        likebutton.classList.toggle("liked", isLiked);
        likebutton.title = isLiked ? "Unlike this Song" : "Like this Song";

        savebutton.classList.toggle("saved", isSaved);
        savebutton.title = isSaved ? "Remove from Library" : "Add to Library";
        setIcon(savebutton, isSaved ? "check" : "plus");
    }


    playbutton.addEventListener("click", function () {
        if (currentIndex < 0) {
            // if nothing picked, start with the first song on screen
            const list = songsForTab(currentTab);
            if (list.length > 0) playFrom(list, 0);
            return;
        }
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    });

    nextbutton.addEventListener("click", playNext);
    previousbutton.addEventListener("click", playPrevious);

    audio.addEventListener("play", function () {
        setIcon(playbutton, "pause");
        thumbnail.classList.add("spinning");
    });

    audio.addEventListener("pause", function () {
        setIcon(playbutton, "play");
        thumbnail.classList.remove("spinning");
    });

    audio.addEventListener("playing", function () {
        errorCount = 0;
    });

    audio.addEventListener("ended", playNext);

    audio.addEventListener("loadedmetadata", function () {
        if (isFinite(audio.duration)) {
            seekbar.max = audio.duration;
            totaltime.textContent = formatTime(audio.duration);
        }
    });

    audio.addEventListener("timeupdate", function () {
        seekbar.value = audio.currentTime;
        currenttime.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener("error", function () {
        // broken link 
        errorCount++;
        playerartist.textContent = "Couldn't load this song";
        if (errorCount < currentList.length) {
            setTimeout(playNext, 1200);
        }
    });

    seekbar.addEventListener("input", function () {
        audio.currentTime = Number(seekbar.value);
        currenttime.textContent = formatTime(audio.currentTime);
    });

    // volume 
    const savedVolume = parseFloat(localStorage.getItem("riff_volume"));
    if (!isNaN(savedVolume)) {
        audio.volume = savedVolume;
        volume.value = savedVolume;
    }

    volume.addEventListener("input", function () {
        audio.volume = Number(volume.value);
        try {
            localStorage.setItem("riff_volume", volume.value);
        } catch (err) { }
    });

    //  like / library 
    likebutton.addEventListener("click", function () {
        const song = currentSong();
        if (!song) return;

        toggleInList(liked, song.id);
        saveList("riff_liked", liked);
        updateSideButtons();
        if (currentTab === "like") showTab("like");
    });

    savebutton.addEventListener("click", function () {
        const song = currentSong();
        if (!song) return;

        toggleInList(library, song.id);
        saveList("riff_library", library);
        updateSideButtons();
        if (currentTab === "library") showTab("library");
    });

    // sidebar tabs
    navbuttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            showTab(btn.dataset.tab);
        });
    });


    showTab("catalog");
    renderQueue();
});