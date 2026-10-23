const api = "http://127.0.0.1:5000/api"
let token = sessionStorage.getItem("homeToken") || ""
let myRole = ""
let roomData = []
let deviceData = []
let routineData = []
let groupData = []

const authSection = document.getElementById("authSection")
const appSection = document.getElementById("appSection")
const messageBox = document.getElementById("message")

function showMessage(msg, isError = false) {

  messageBox.innerText = msg
  if (isError) {
    messageBox.className = "error"
  } else {
    messageBox.className = ""
  }
  messageBox.style.display = "block"
  setTimeout(function () {
    messageBox.style.display = "none"
  }, 3500)
}

async function request(url, method = "GET", bodyData = null) {

  const options = {
    method: method,
    headers: {
      "Content-Type": "application/json"
    }
  }

  if (token) {
    options.headers["Authorization"] = "Bearer " + token
  }

  if (bodyData) {
    options.body = JSON.stringify(bodyData)
  }

  const response = await fetch(api + url, options)

  const result = await response.json().catch(function () {
    return {}
  })

  if (!response.ok) {
    throw new Error(result.message || "Request failed")
  }

  return result
}

function showLoggedIn() {

  authSection.hidden = true
  appSection.hidden = false
  document.getElementById("logoutBtn").hidden = false
}

function showLoggedOut() {

  authSection.hidden = false
  appSection.hidden = true
  document.getElementById("logoutBtn").hidden = true

}

async function loadProfile() {
  const user = await request("/auth/me")
  myRole = user.role

  showLoggedIn()

  if (!user.household) {
    document.getElementById("houseInfo").innerText = "Create a household to start managing devices."
    return
  }

  await refreshDashboard()
}

async function refreshDashboard() {
  const user = await request("/auth/me")
  myRole = user.role

  if (!user.household) {
    document.getElementById("houseInfo").innerText = "Create a household to start managing devices."
    return
  }

  const homeData = await request("/household")
  const rooms = await request("/rooms")
  const devices = await request("/devices")
  const routines = await request("/routines")
  const groups = await request("/smart-home/groups")

  roomData = Array.isArray(rooms) ? rooms : []
  deviceData = Array.isArray(devices) ? devices : []
  routineData = Array.isArray(routines) ? routines : []
  groupData = Array.isArray(groups) ? groups : []

  const home = homeData.household || homeData.home || {}

  let infoText = (home.name || "My Home") + " | Role: " + myRole
  if (home.emergencyMode) {
    infoText += " | EMERGENCY ACTIVE"
  }
  document.getElementById("houseInfo").innerText = infoText

  renderRooms()
  renderDevices()
  renderRoutines()
  renderGroups()
  renderMembers(homeData.members || [])
  checkPermissions()
}

function checkPermissions() {

  const isAdmin = myRole === "Admin"
  const adminForms = ["houseForm", "roomForm", "deviceForm", "routineForm", "groupForm", "memberForm"]

  for (let i = 0; i < adminForms.length; i++) {

    const el = document.getElementById(adminForms[i])
    if (el) {
      el.hidden = !isAdmin

    }
  }

  document.getElementById("emergencyBtn").hidden = !isAdmin
  document.getElementById("stopEmergencyBtn").hidden = !isAdmin
}

function renderRooms() {

  const list = document.getElementById("roomList")
  const select = document.getElementById("roomSelect")
  list.innerHTML = ""
  select.innerHTML = '<option value="">Choose room</option>'

  for (let i = 0; i < roomData.length; i++) {

    const item = document.createElement("li")
    item.innerText = roomData[i].name
    list.appendChild(item)

    const opt = document.createElement("option")
    opt.value = roomData[i]._id
    opt.innerText = roomData[i].name
    select.appendChild(opt)
  }
}

function renderDevices() {

  const container = document.getElementById("deviceList")
  container.innerHTML = ""

  let onCount = 0

  for (let i = 0; i < deviceData.length; i++) {
    if (deviceData[i].power) {
      onCount++
    }

  }
  document.getElementById("summary").innerText = deviceData.length + " devices | " + onCount + " running"

  for (let i = 0; i < deviceData.length; i++) {

    const d = deviceData[i]
    const card = document.createElement("article")
    card.className = "device-card"

    const roomName = (d.room && d.room.name) ? d.room.name : "Unassigned"
    const features = d.features || {}

    let cardHtml = ""
    cardHtml += "<h3>" + d.name + "</h3>"
    cardHtml += "<p>" + d.type + " - " + roomName + "</p>"
    cardHtml += "<p>Status: <strong>" + d.status + "</strong></p>"
    cardHtml += "<p>Power: " + (d.power ? "On" : "Off") + " (" + d.watts + "W)</p>"

    if (d.connected) {
      cardHtml += '<button onclick="disconnectDevice(\'' + d._id + '\')">Disconnect</button>'
    } else {
      cardHtml += '<button onclick="connectDevice(\'' + d._id + '\')">Connect</button>'
    }

    const disablePower = (!d.connected || d.malfunction) ? "disabled" : ""
    cardHtml += '<button ' + disablePower + ' onclick="togglePower(\'' + d._id + '\', ' + !d.power + ')">'
    cardHtml += d.power ? "Turn Off" : "Turn On"
    cardHtml += '</button>'

    if (myRole !== "Child") {
      if (d.type === "Lamp") {

        cardHtml += '<div class="settings">'
        cardHtml += '<label>Brightness: <input type="number" min="0" max="100" id="bright-' + d._id + '" value="' + (features.brightness || 100) + '"></label>'

        cardHtml += '<label>Color: <select id="color-' + d._id + '">'
        cardHtml += '<option value="Warm"' + (features.color === "Warm" ? " selected" : "") + '>Warm</option>'
        cardHtml += '<option value="Cold"' + (features.color === "Cold" ? " selected" : "") + '>Cold</option>'
        cardHtml += '</select></label>'
        cardHtml += '<button onclick="saveLampSettings(\'' + d._id + '\')">Save Settings</button>'
        cardHtml += '</div>'

      } else if (d.type === "Fan") {

        cardHtml += '<div class="settings">'
        cardHtml += '<label>Speed: <select id="speed-' + d._id + '">'
        const speeds = ["Low", "Medium", "High"]

        for (let s = 0; s < speeds.length; s++) {
          cardHtml += '<option value="' + speeds[s] + '"' + (features.speed === speeds[s] ? " selected" : "") + '>' + speeds[s] + '</option>'
        }

        cardHtml += '</select></label>'
        cardHtml += '<button onclick="saveFanSettings(\'' + d._id + '\')">Save Settings</button>'
        cardHtml += '</div>'

      } else if (d.type === "Thermostat" || d.type === "AC" || d.type === "Heater") {

        cardHtml += '<div class="settings">'
        cardHtml += '<label>Temperature (18-30 C): <input type="number" min="18" max="30" id="temp-' + d._id + '" value="' + (features.temperature || 24) + '"></label>'

        cardHtml += '<button onclick="saveTempSettings(\'' + d._id + '\')">Save Settings</button>'
        cardHtml += '</div>'
      }
    }

    if (myRole === "Admin") {

      cardHtml += '<button onclick="simulateMalfunction(\'' + d._id + '\')">Simulate Malfunction</button>'

      cardHtml += '<button onclick="resetDevice(\'' + d._id + '\')">Reset Device</button>'

      cardHtml += '<button class="danger" onclick="deleteDevice(\'' + d._id + '\')">Delete Device</button>'

    }

    card.innerHTML = cardHtml
    container.appendChild(card)
  }

  const routineSelect = document.getElementById("routineDevice")
  const groupSelect = document.getElementById("groupDevices")
  routineSelect.innerHTML = '<option value="">Choose device</option>'
  groupSelect.innerHTML = ""

  for (let i = 0; i < deviceData.length; i++) {

    const opt1 = document.createElement("option")
    opt1.value = deviceData[i]._id
    opt1.innerText = deviceData[i].name
    routineSelect.appendChild(opt1)

    const opt2 = document.createElement("option")
    opt2.value = deviceData[i]._id
    opt2.innerText = deviceData[i].name
    groupSelect.appendChild(opt2)
  }
}

function renderRoutines() {
  const list = document.getElementById("routineList")
  list.innerHTML = ""

  for (let i = 0; i < routineData.length; i++) {
    const r = routineData[i]
    const li = document.createElement("li")
    let txt = r.name + " at " + r.time + " - " + (r.active ? "Active" : "Paused")
    li.innerText = txt

    if (myRole === "Admin") {

      const toggleBtn = document.createElement("button")
      toggleBtn.style.marginLeft = "10px"

      toggleBtn.innerText = r.active ? "Pause" : "Resume"

      toggleBtn.onclick = function () {
        toggleRoutine(r._id, !r.active)
      }
      li.appendChild(toggleBtn)

      const delBtn = document.createElement("button")
      delBtn.className = "danger"
      delBtn.style.marginLeft = "5px"
      delBtn.innerText = "Delete"
      delBtn.onclick = function () {
        deleteRoutine(r._id)
      }
      li.appendChild(delBtn)
    }

    list.appendChild(li)
  }
}

function renderGroups() {

  const container = document.getElementById("groupList")
  container.innerHTML = ""

  for (let i = 0; i < groupData.length; i++) {
    const g = groupData[i]
    const card = document.createElement("article")
    card.className = "device-card"

    const devNames = []
    if (g.devices) {
      for (let j = 0; j < g.devices.length; j++) {
        devNames.push(g.devices[j].name || "Device")
      }
    }

    let html = "<h3>" + g.name + "</h3>"
    html += "<p>Devices: " + (devNames.join(", ") || "None") + "</p>"
    html += '<button onclick="runGroup(\'' + g._id + '\', true)">Turn All On</button>'
    html += '<button onclick="runGroup(\'' + g._id + '\', false)">Turn All Off</button>'

    if (myRole === "Admin") {
      html += '<button class="danger" onclick="deleteGroup(\'' + g._id + '\')">Delete Group</button>'
    }

    card.innerHTML = html
    container.appendChild(card)
  }
}

function renderMembers(members) {

  const list = document.getElementById("memberList")
  list.innerHTML = ""

  for (let i = 0; i < members.length; i++) {

    const m = members[i]
    const li = document.createElement("li")
    li.innerText = m.name + " (" + m.email + ") - Role: " + m.role

    if (myRole === "Admin" && m.role !== "Admin") {
      const btn = document.createElement("button")

      btn.className = "danger"
      btn.style.marginLeft = "10px"
      btn.innerText = "Remove"

      btn.onclick = function () {
        removeMember(m._id)
      }
      li.appendChild(btn)
    }

    list.appendChild(li)
  }
}

// Authentication Forms
document.getElementById("registerForm").addEventListener("submit", async function (e) {


  e.preventDefault()
  const form = e.target
  const body = {
    name: form.name.value,
    email: form.email.value,
    password: form.password.value
  }

  try {

    await request("/auth/register", "POST", body)
    form.reset()
    showMessage("Account created! Please log in.")

  } catch (err) {
    showMessage(err.message, true)
  }
})

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault()
  const form = e.target
  const body = {
    email: form.email.value,
    password: form.password.value
  }

  try {
    
    const res = await request("/auth/login", "POST", body)
    token = res.token
    sessionStorage.setItem("homeToken", token)
    form.reset()
    await loadProfile()
    showMessage("Login successful!")
  } catch (err) {
    showMessage(err.message, true)
  }
})

document.getElementById("logoutBtn").addEventListener("click", async function () {
  try {
    await request("/auth/logout", "POST")
  } catch (err) {
    // Logout locally anyway
  }
  token = ""
  myRole = ""

  sessionStorage.removeItem("homeToken")
  showLoggedOut()
  showMessage("Logged out")
})

// Setup Forms
document.getElementById("houseForm").addEventListener("submit", async function (e) {
  e.preventDefault()

  const form = e.target

  try {
    await request("/household", "POST", { name: form.name.value })
    form.reset()

    await loadProfile()
    showMessage("Household created!")

  } catch (err) {
    showMessage(err.message, true)
  }
})

document.getElementById("roomForm").addEventListener("submit", async function (e) {
  e.preventDefault()
  const form = e.target
  try {
    await request("/rooms", "POST", { name: form.name.value })
    form.reset()
    
    await refreshDashboard()
    showMessage("Room added!")

  } catch (err) {
    showMessage(err.message, true)
  }
})

document.getElementById("deviceForm").addEventListener("submit", async function (e) {

  e.preventDefault()
  
  const form = e.target
  const body = {
    name: form.name.value,
    type: form.type.value,
    room: form.room.value,
    watts: Number(form.watts.value) || 0
  }

  try {

    await request("/devices", "POST", body)
    form.reset()

    await refreshDashboard()
    showMessage("Device created! Please connect it.")
  } catch (err) {
    showMessage(err.message, true)
  }
})

// Device Actions
async function connectDevice(id) {

  try {
    await request("/devices/" + id + "/connect", "POST", {})
    await refreshDashboard()
    showMessage("Device connected")
  } catch (err) {
    showMessage(err.message, true)
  }
}

async function disconnectDevice(id) {
  try {
    await request("/devices/" + id + "/disconnect", "POST", {})
    await refreshDashboard()

    showMessage("Device disconnected")

  } catch (err) {
    showMessage(err.message, true)
  }
}

async function togglePower(id, state) {
  try {

    await request("/devices/" + id + "/power", "PATCH", { power: state })
    await refreshDashboard()
  } catch (err) {
    showMessage(err.message, true)
  }
}

async function saveLampSettings(id) {

  const brightness = Number(document.getElementById("bright-" + id).value)
  const color = document.getElementById("color-" + id).value
  
  try {

    await request("/devices/" + id + "/features", "PATCH", { brightness: brightness, color: color })

    await refreshDashboard()
    showMessage("Lamp settings saved")

  } catch (err) {
    showMessage(err.message, true)
  }
}

async function saveFanSettings(id) {
  const speed = document.getElementById("speed-" + id).value

  try {
    await request("/devices/" + id + "/features", "PATCH", { speed: speed })
    await refreshDashboard()
    showMessage("Fan settings saved")

  } catch (err) {
    showMessage(err.message, true)
  }
}

async function saveTempSettings(id) {

  const temperature = Number(document.getElementById("temp-" + id).value)
  try {
    await request("/devices/" + id + "/features", "PATCH", { temperature: temperature })

    await refreshDashboard()
    showMessage("Temperature saved")

  } catch (err) {
    showMessage(err.message, true)
  }
}

async function simulateMalfunction(id) {

  try {
    await request("/devices/" + id + "/malfunction", "POST", {})
    await refreshDashboard()
    showMessage("Malfunction simulated")

  } catch (err) {
    showMessage(err.message, true)
  }
}

async function resetDevice(id) {
  try {

    await request("/devices/" + id + "/reset", "POST", {})
    await refreshDashboard()
    showMessage("Device reset done")

  } catch (err) {
    showMessage(err.message, true)
  }
}

async function deleteDevice(id) {

  if (!confirm("Are you sure you want to delete this device?")) return
  try {

    await request("/devices/" + id, "DELETE")
    await refreshDashboard()
    showMessage("Device deleted")

  } catch (err) {
    showMessage(err.message, true)
  }
}

// Routine Forms

document.getElementById("routineForm").addEventListener("submit", async function (e) {
  e.preventDefault()
  const form = e.target

  const body = {
    name: form.name.value,
    time: form.time.value,
    actions: [
      {
        device: form.device.value,
        power: form.power.value === "true"
      }
    ]
  }

  try {

    await request("/routines", "POST", body)
    form.reset()

    await refreshDashboard()
    showMessage("Routine created!")
  } catch (err) {
    showMessage(err.message, true)
  }
})

async function toggleRoutine(id, state) {
  try {
    await request("/routines/" + id, "PATCH", { active: state })
    await refreshDashboard()
  } catch (err) {
    showMessage(err.message, true)
  }
}

async function deleteRoutine(id) {
  
  if (!confirm("Delete this routine?")) return
  try {

    await request("/routines/" + id, "DELETE")
    await refreshDashboard()
    showMessage("Routine deleted")

  } catch (err) {
    showMessage(err.message, true)
  }
}

document.getElementById("groupForm").addEventListener("submit", async function (e) {
  e.preventDefault()
  
  const form = e.target
  const select = document.getElementById("groupDevices")

  const selectedDevices = []

  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].selected) {
      selectedDevices.push(select.options[i].value)
    }
  }

  try {
    await request("/smart-home/groups", "POST", {name: form.name.value,
    devices: selectedDevices
    })

    form.reset()

    await refreshDashboard()
    showMessage("Group created!")
  } catch (err) {
    showMessage(err.message, true)
  }
})

async function runGroup(id, state) {

  try {

    await request("/smart-home/groups/" + id + "/run", "POST", { power: state })
    await refreshDashboard()

    showMessage("Group action executed")

  } catch (err) {
    showMessage(err.message, true)
  }
}

async function deleteGroup(id) {

  if (!confirm("Delete this group?")) return
  try {

    await request("/smart-home/groups/" + id, "DELETE")

    await refreshDashboard()
    showMessage("Group deleted")

  } catch (err) {
    showMessage(err.message, true)
  }
}


document.getElementById("voiceForm").addEventListener("submit", async function (e) {

  e.preventDefault()
  const form = e.target
  try {

    const res = await request("/smart-home/voice", "POST", { command: form.command.value })

    await refreshDashboard()

    showMessage(res.message || "Command executed")
  } catch (err) {

    showMessage(err.message, true)
  }
})

// Emergency Mode
document.getElementById("emergencyBtn").addEventListener("click", async function () {

  if (!confirm("Activate Emergency Mode? All devices will turn off")) return

  try {
    await request("/smart-home/emergency", "POST", {})

    await refreshDashboard()
    showMessage("Emergency Mode Activated")

  } catch (err) {
    showMessage(err.message, true)
  }
})

document.getElementById("stopEmergencyBtn").addEventListener("click", async function () {
  try {

    await request("/smart-home/emergency/stop", "POST", {})
    await refreshDashboard()

    showMessage("Emergency Mode Deactivated")
  } catch (err) {
    showMessage(err.message, true)
  }
})


document.getElementById("energyBtn").addEventListener("click", async function () {
  try {
    const data = await request("/energy")

    const box = document.getElementById("energyReport")

    let html = "<p><strong>Total Usage:</strong> " + (data.totalKWh || 0) + " kWh</p><ul>"

    const reportList = data.report || []

    for (let i = 0; i < reportList.length; i++) {
      html += "<li>" + reportList[i].deviceName + ": " + reportList[i].minutes + " mins, " + reportList[i].kWh + " kWh</li>"
    }
    html += "</ul>"
    box.innerHTML = html
  } catch (err) {

    showMessage(err.message, true)
  }
})

document.getElementById("tipsBtn").addEventListener("click", async function () {
  try {
    const tips = await request("/energy/recommendations")

    const list = document.getElementById("tipsList")
    list.innerHTML = ""
    for (let i = 0; i < tips.length; i++) 
      {
      const li = document.createElement("li")

      li.innerText = (tips[i].device || "Home") + ": " + tips[i].suggestion
      list.appendChild(li)
    }
  } catch (err) {
    showMessage(err.message, true)
  }
})

document.getElementById("predictionBtn").addEventListener("click", async function () {

  try {
    const preds = await request("/smart-home/predictions")

    const list = document.getElementById("predictionList")
    list.innerHTML = ""
    for (let i = 0; i < preds.length; i++) {
      const li = document.createElement("li")
      li.innerText = (preds[i].device || "Home") + ": " + (preds[i].suggestion || preds[i].suggestions)
      list.appendChild(li)
    }
  } catch (err) {
    showMessage(err.message, true)
  }
})

document.getElementById("alertsBtn").addEventListener("click", async function () {

  try {
    const alerts = await request("/energy/alerts")
    const list = document.getElementById("alertList")
    list.innerHTML = ""

    for (let i = 0; i < alerts.length; i++) {
      const li = document.createElement("li")

      li.innerText = alerts[i].message + " (" + (alerts[i].resolved ? "Resolved" : "Open") + ")"
      list.appendChild(li)
    }
  } catch (err) {
    showMessage(err.message, true)
  }
})

// Member Add
document.getElementById("memberForm").addEventListener("submit", async function (e) {
  e.preventDefault()

  const form = e.target

  try {
    await request("/household/members", "POST", {
      email: form.email.value,
      role: form.role.value
    })

    form.reset()
    await refreshDashboard()
    showMessage("Member added")

  } catch (err) {
    showMessage(err.message, true)
  }
})

async function removeMember(id) {

  if (!confirm("Remove this member?")) return
  try {

    await request("/household/members/" + id, "DELETE")
    await refreshDashboard()

    showMessage("Member removed")

  } catch (err) {
    showMessage(err.message, true)
  }
}

document.getElementById("refreshBtn").addEventListener("click", async function () {
  try {
    await refreshDashboard()
    showMessage("Dashboard refreshed")

  } catch (err) {
    showMessage(err.message, true)
  }
})

if (token) {
  loadProfile().catch(function () {
    token = ""
    sessionStorage.removeItem("homeToken")
    showLoggedOut()
  })
} else {
  showLoggedOut()
}