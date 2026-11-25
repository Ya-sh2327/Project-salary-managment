import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3, Bell, CalendarDays, ChevronDown, CircleDollarSign,
  Calculator, CreditCard, Grid2X2, IndianRupee, LogOut, Menu, PiggyBank, Plus, ReceiptText,
  Search, Settings, Target, TrendingDown, TrendingUp, WalletCards,
  Wallet, X, Download, Send, Trash2, Pencil, Repeat2, Upload, RotateCcw,
  Tags, Eraser, Smartphone
} from 'lucide-react'
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import './App.css'

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler)

const formatMoney = (value) => `₹${Number(value).toLocaleString('en-IN')}`
const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const formatMonth = (value) => {
  if (!value) return ''
  return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}
const previousMonthKey = (value) => {
  const date = new Date(`${value}-01T00:00:00`)
  date.setMonth(date.getMonth() - 1)
  return getMonthKey(date)
}
const formatYear = (value) => value.slice(0, 4)
const formatDate = (value) => {
  if (!value) return ''
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
const dueWithinDays = (day, daysAhead) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const makeDueDate = (year, month) => {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(Number(day), lastDay))
  }
  let dueDate = makeDueDate(today.getFullYear(), today.getMonth())
  if (dueDate < today) dueDate = makeDueDate(today.getFullYear(), today.getMonth() + 1)
  const daysUntilDue = Math.ceil((dueDate - today) / 86400000)
  return daysUntilDue <= daysAhead
}
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const getLastSevenDayLabels = () => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - 6 + index)
  return String(date.getDate())
})
const getLastSevenDays = (expenses) => {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - 6 + index)
    return dateKey(date)
  })
  return dates.map((date) => expenses
    .filter((item) => !item.income && item.date === date)
    .reduce((sum, item) => sum + Number(item.amount), 0))
}

const categories = [
  { name: 'Food', color: '#4c74ff' },
  { name: 'Shopping', color: '#ff6b49' },
  { name: 'Travel', color: '#ffb21c' },
  { name: 'Bills', color: '#17bd83' },
  { name: 'Others', color: '#a36af4' },
]

const initialExpenses = [
  { id: 1, name: 'Zomato', amount: 350, category: 'Food', date: '2026-11-16', method: 'UPI', demo: true },
  { id: 2, name: 'Salary Received', amount: 35000, category: 'Income', date: '2026-11-01', method: 'Bank', income: true, demo: true },
  { id: 3, name: 'Mobile Recharge', amount: 299, category: 'Bills', date: '2026-11-15', method: 'UPI', demo: true },
]

function App() {
  const [active, setActive] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal, setModal] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [contributionGoalId, setContributionGoalId] = useState(null)
  const [dark, setDark] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()))
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem('mymoney-custom-categories')
    return saved ? JSON.parse(saved) : []
  })
  const allCategories = useMemo(() => [
    ...categories,
    ...customCategories.filter((name) => !categories.some((item) => item.name === name))
      .map((name, index) => ({ name, color: ['#8b6cf6', '#18a8b8', '#e2863b', '#d75d91'][index % 4] })),
  ], [customCategories])
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsRead, setNotificationsRead] = useState(() => localStorage.getItem('mymoney-notifications-read') === 'true')
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(() => localStorage.getItem('mymoney-notification-sound') !== 'false')
  const audioContextRef = useRef(null)
  const previousNotificationsRef = useRef(new Set())
  const [reminderDays, setReminderDays] = useState(() => {
    const saved = localStorage.getItem('mymoney-reminder-days')
    return saved === null ? 7 : Number(saved)
  })
  const [remindersEnabled, setRemindersEnabled] = useState(() => localStorage.getItem('mymoney-reminders-enabled') !== 'false')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches)
  const [installMessage, setInstallMessage] = useState('')
  const [budgets, setBudgets] = useState(() => {
    const saved = localStorage.getItem('mymoney-budgets')
    const storedBudgets = saved ? JSON.parse(saved) : []
    const defaultBudgets = [
      { name: 'Food', amount: 4000 },
      { name: 'Shopping', amount: 3000 },
      { name: 'Travel', amount: 2000 },
      { name: 'Bills', amount: 2500 },
      { name: 'Entertainment', amount: 1500 },
      { name: 'Others', amount: 2000 },
    ]
    const merged = defaultBudgets.map((budget) => storedBudgets.find((item) => item.name === budget.name) || budget)
    allCategories.filter((item) => !merged.some((budget) => budget.name === item.name)).forEach((item) => {
      merged.push(storedBudgets.find((budget) => budget.name === item.name) || { name: item.name, amount: 0 })
    })
    return [...merged, ...storedBudgets.filter((budget) => !merged.some((item) => item.name === budget.name))]
  })
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('mymoney-goals')
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'iPhone', target: 90000, saved: 30000, date: '2027-06-30', demo: true },
      { id: 2, name: 'Emergency Fund', target: 50000, saved: 18000, date: '2027-03-31', demo: true },
    ]
  })
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('mymoney-profile')
    if (!saved) return { name: 'Hemangini Patil', email: 'user@example.com', currency: 'INR', theme: 'Light' }
    const storedProfile = JSON.parse(saved)
    return {
      ...storedProfile,
      name: storedProfile.name?.trim().toLowerCase() === 'rahul sharma' ? 'Hemangini Patil' : storedProfile.name,
      email: storedProfile.email === 'rahul@email.com' ? 'user@example.com' : storedProfile.email,
      currency: 'INR',
    }
  })
  const [incomeByMonth, setIncomeByMonth] = useState(() => {
    const saved = localStorage.getItem('mymoney-incomes')
    if (saved) return JSON.parse(saved)
    const month = getMonthKey(new Date())
    const legacySalary = Number(localStorage.getItem('mymoney-salary'))
    const total = legacySalary || (month === '2026-11' ? 35000 : 0)
    return total ? { [month]: { basic: total, bonus: 0, other: 0, total, receivedDate: `${month}-01`, demo: !legacySalary } } : {}
  })
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('mymoney-expenses')
    return saved ? JSON.parse(saved) : initialExpenses
  })
  const [recurringBills, setRecurringBills] = useState(() => {
    const saved = localStorage.getItem('mymoney-recurring-bills')
    return saved ? JSON.parse(saved) : []
  })
  const profileName = profile.name || 'MyMoney'
  const profileInitials = profileName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      setInstallMessage('MyMoney has been installed.')
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const monthlyExpenses = useMemo(
    () => expenses.filter((item) => item.date && item.date.slice(0, 7) === selectedMonth),
    [expenses, selectedMonth]
  )
  const salaryRecord = incomeByMonth[selectedMonth]
  const salary = Number(salaryRecord?.total || 0)
  const expenseTotal = useMemo(
    () => monthlyExpenses.filter((item) => !item.income).reduce((sum, item) => sum + Number(item.amount), 0),
    [monthlyExpenses]
  )
  const balance = salary - expenseTotal
  const categoryTotals = useMemo(() => {
    const totals = Object.fromEntries(allCategories.map((item) => [item.name, 0]))
    monthlyExpenses.filter((item) => !item.income).forEach((item) => {
      const category = totals[item.category] === undefined ? 'Others' : item.category
      totals[category] += Number(item.amount)
    })
    return totals
  }, [monthlyExpenses, allCategories])
  const highestCategory = allCategories
    .map((item) => ({ ...item, amount: categoryTotals[item.name] }))
    .sort((a, b) => b.amount - a.amount)[0]
  const goalSavedTotal = goals.reduce((sum, goal) => sum + Number(goal.saved), 0)
  const goalTargetTotal = goals.reduce((sum, goal) => sum + Number(goal.target), 0)
  const goalProgress = goalTargetTotal ? Math.min(Math.round((goalSavedTotal / goalTargetTotal) * 100), 100) : 0
  const budgetInsights = useMemo(() => budgets
    .map((budget) => ({
      ...budget,
      spent: categoryTotals[budget.name] || 0,
      percent: budget.amount ? Math.round(((categoryTotals[budget.name] || 0) / budget.amount) * 100) : 0,
    }))
    .filter((budget) => budget.amount > 0 && budget.percent >= 80)
    .sort((a, b) => b.percent - a.percent), [budgets, categoryTotals])
  const smartInsights = [
    highestCategory.amount
      ? {
          text: `Your highest spending is ${highestCategory.name} at ${formatMoney(highestCategory.amount)}.`,
          page: 'Transactions',
          query: highestCategory.name,
        }
      : { text: 'Add an expense to get category-specific spending insights.', page: 'Expenses' },
    budgetInsights.length
      ? {
          text: `${budgetInsights[0].name} budget is ${budgetInsights[0].percent}% used (${formatMoney(budgetInsights[0].spent)} of ${formatMoney(budgetInsights[0].amount)}).`,
          page: 'Budget Planner',
        }
      : {
          text: balance >= 0
            ? `${formatMoney(Math.max(balance, 0))} remains after recorded expenses this month.`
            : `Expenses are ${formatMoney(Math.abs(balance))} above your recorded income.`,
          page: 'Analytics',
        },
    {
      text: goalTargetTotal
        ? `Savings goals are ${goalProgress}% complete. ${formatMoney(goalSavedTotal)} saved so far.`
        : 'Create a savings goal to track your progress.',
      page: 'Savings Goals',
    },
  ]
  const pages = ['Dashboard', 'Salary & Income', 'Expenses', 'Analytics', 'Budget Planner', 'Calculator', 'Savings Goals', 'Categories', 'Recurring Bills', 'Transactions', 'Reports', 'AI Assistant', 'Settings']
  const normalizedSearch = search.trim().toLowerCase()
  const searchResults = normalizedSearch ? [
    ...pages.filter((page) => page.toLowerCase().includes(normalizedSearch)).map((page) => ({ label: page, detail: 'Open page', page, type: 'page' })),
    ...expenses.filter((item) => `${item.name} ${item.category} ${item.method}`.toLowerCase().includes(normalizedSearch))
      .slice(0, 5).map((item) => ({ label: item.name, detail: `${item.category} · ${formatMoney(item.amount)}`, page: 'Transactions', query: item.name, month: item.date?.slice(0, 7), type: 'transaction' })),
  ].slice(0, 7) : []
  const notifications = useMemo(() => [
    ...(monthlyExpenses.length ? [{
      id: `latest-expense-${monthlyExpenses[0].id}`,
      title: `Latest: ${monthlyExpenses[0].name}`,
      detail: `${monthlyExpenses[0].category} · ${formatMoney(monthlyExpenses[0].amount)}`,
      page: monthlyExpenses[0].income ? 'Salary & Income' : 'Transactions',
    }] : []),
    ...budgetInsights.map((budget) => ({
      id: `budget-${budget.name}`,
      title: `${budget.name} budget ${budget.percent >= 100 ? 'exceeded' : 'nearly reached'}`,
      detail: `${budget.percent}% used · ${formatMoney(budget.spent)} of ${formatMoney(budget.amount)}`,
      page: 'Budget Planner',
    })),
    ...recurringBills.filter((bill) => remindersEnabled && bill.active).map((bill) => ({
      id: `recurring-${bill.id}`,
      title: selectedMonth === getMonthKey(new Date()) && dueWithinDays(bill.day, reminderDays) ? `Upcoming bill: ${bill.name}` : `Recurring bill: ${bill.name}`,
      detail: `${formatMoney(bill.amount)} · due monthly on day ${bill.day}`,
      page: 'Recurring Bills',
    })),
    {
      id: 'balance-summary',
      title: balance >= 0 ? 'You are within your income' : 'Expenses exceed your income',
      detail: `${formatMoney(Math.abs(balance))} ${balance >= 0 ? 'available this month' : 'over your monthly income'}`,
      page: 'Dashboard',
    },
    {
      id: 'budget-reminder',
      title: 'Review your monthly budgets',
      detail: 'Check category spending and adjust limits if needed.',
      page: 'Budget Planner',
    },
  ], [monthlyExpenses, budgetInsights, recurringBills, remindersEnabled, selectedMonth, reminderDays, balance])

  const playNotificationSound = useCallback((force = false) => {
    if (!force && !notificationSoundEnabled) return
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const audioContext = audioContextRef.current || (audioContextRef.current = new AudioContextClass())
    const playTink = () => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const startTime = audioContext.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(1046, startTime)
      oscillator.frequency.exponentialRampToValueAtTime(784, startTime + 0.18)
      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.29)
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(playTink).catch((error) => console.error('Could not resume notification audio:', error))
    } else {
      playTink()
    }
  }, [notificationSoundEnabled])

  useEffect(() => {
    const currentNotifications = new Set(notifications.map((item) => `${item.id}|${item.title}|${item.detail}`))
    const hasNewNotification = [...currentNotifications].some((item) => !previousNotificationsRef.current.has(item))
    if (previousNotificationsRef.current.size && hasNewNotification && !notificationsRead) playNotificationSound()
    previousNotificationsRef.current = currentNotifications
  }, [notifications, notificationsRead, playNotificationSound])

  const selectSearchResult = (result) => {
    setActive(result.page)
    setSearch(result.query || '')
    if (result.month) setSelectedMonth(result.month)
    setSearchFocused(false)
  }

  const goToPage = (page, query = '') => {
    setActive(page)
    setSearch(query)
    setSearchFocused(false)
    setNotificationsOpen(false)
  }

  const installApp = async () => {
    if (!installPrompt) {
      setInstallMessage('If installation is available, use your browser menu to install MyMoney.')
      return
    }
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallMessage(choice.outcome === 'accepted' ? 'MyMoney installation started.' : 'Installation was cancelled.')
    } catch (error) {
      setInstallMessage(`Could not start installation: ${error.message}`)
    } finally {
      setInstallPrompt(null)
    }
  }

  const markNotificationsRead = () => {
    setNotificationsRead(true)
    localStorage.setItem('mymoney-notifications-read', 'true')
  }

  const openExpenseForm = (expense = null) => {
    setEditingExpense(expense)
    setModal(expense ? 'edit-expense' : 'expense')
  }

  const saveExpense = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const item = {
      ...(editingExpense || {}),
      id: editingExpense?.id || Date.now(),
      name: data.get('name'),
      amount: Number(data.get('amount')),
      category: data.get('category'),
      date: data.get('date') || `${selectedMonth}-01`,
      method: data.get('method'),
      notes: data.get('notes'),
    }
    const next = editingExpense
      ? expenses.map((expense) => expense.id === editingExpense.id ? item : expense)
      : [item, ...expenses]
    setExpenses(next)
    localStorage.setItem('mymoney-expenses', JSON.stringify(next))
    setNotificationsRead(false)
    localStorage.setItem('mymoney-notifications-read', 'false')
    if (editingExpense) setSelectedMonth(item.date.slice(0, 7))
    setEditingExpense(null)
    setModal(null)
  }

  const saveSalary = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const basic = Number(data.get('basic'))
    const bonus = Number(data.get('bonus') || 0)
    const other = Number(data.get('other') || 0)
    const total = basic + bonus + other
    const receivedDate = data.get('receivedDate') || `${selectedMonth}-01`
    const month = receivedDate.slice(0, 7)
    const next = { ...incomeByMonth, [month]: { basic, bonus, other, total, receivedDate } }
    setIncomeByMonth(next)
    localStorage.setItem('mymoney-incomes', JSON.stringify(next))
    if (month === getMonthKey(new Date())) localStorage.setItem('mymoney-salary', String(total))
    setNotificationsRead(false)
    localStorage.setItem('mymoney-notifications-read', 'false')
    setSelectedMonth(month)
    setModal(null)
  }

  const saveGoalContribution = (event) => {
    event.preventDefault()
    const amount = Number(new FormData(event.currentTarget).get('amount'))
    const next = goals.map((goal) => goal.id === contributionGoalId ? { ...goal, saved: Number(goal.saved) + amount } : goal)
    setGoals(next)
    localStorage.setItem('mymoney-goals', JSON.stringify(next))
    setContributionGoalId(null)
    setModal(null)
  }

  const doughnutData = {
    labels: allCategories.map((item) => item.name),
    datasets: [{
      data: allCategories.map((item) => categoryTotals[item.name]),
      backgroundColor: allCategories.map((item) => item.color),
      borderWidth: 0,
      cutout: '68%',
    }],
  }

  const lineData = {
    labels: getLastSevenDayLabels(),
    datasets: [{
      data: getLastSevenDays(monthlyExpenses),
      borderColor: '#4c74ff',
      backgroundColor: 'rgba(76,116,255,.08)',
      pointBackgroundColor: '#4c74ff',
      fill: true,
      tension: 0.42,
    }],
  }

  return (
    <div className={dark ? 'app dark' : 'app'}>
      {mobileOpen && <button className="overlay" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark"><WalletCards size={23} /></div>
          <div><strong>MyMoney</strong><small>Smart Salary Manager</small></div>
        </div>
        <nav>
          {[
            ['Dashboard', Grid2X2], ['Salary & Income', Wallet],
            ['Expenses', ReceiptText], ['Analytics', BarChart3],
            ['Budget Planner', IndianRupee], ['Calculator', Calculator], ['Savings Goals', PiggyBank],
            ['Categories', Tags], ['Recurring Bills', Repeat2],
            ['Transactions', CreditCard], ['Reports', CalendarDays],
            ['AI Assistant', Target], ['Settings', Settings],
          ].map(([label, Icon]) => (
            <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(label); setMobileOpen(false) }}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="profile">
          <span className="avatar">{profileInitials}</span>
          <span><strong>{profileName}</strong><small>{profile.email}</small></span>
          <LogOut size={17} />
        </button>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="search-wrap">
            <label className="search">
              <Search size={18} />
              <input
                value={search}
                onFocus={() => setSearchFocused(true)}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchFocused(false)
                  if (event.key === 'Enter' && searchResults.length) selectSearchResult(searchResults[0])
                }}
                placeholder="Search transactions or pages..."
                aria-label="Search transactions or pages"
                aria-expanded={searchFocused && Boolean(normalizedSearch)}
              />
              {search && <button className="search-clear" onClick={() => { setSearch(''); setSearchFocused(true) }} aria-label="Clear search"><X size={15} /></button>}
            </label>
            {searchFocused && normalizedSearch && (
              <div className="search-results">
                <small>Search results</small>
                {searchResults.length ? searchResults.map((result, index) => (
                  <button key={`${result.type}-${result.label}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchResult(result)}>
                    <span className="search-result-icon">{result.type === 'page' ? <Grid2X2 size={16} /> : <ReceiptText size={16} />}</span>
                    <span><strong>{result.label}</strong><small>{result.detail}</small></span>
                    <ChevronDown size={14} className="result-arrow" />
                  </button>
                )) : <p className="search-empty">No matching pages or transactions.</p>}
              </div>
            )}
          </div>
          <div className="top-actions">
            <button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? '☀️' : '🌙'}</button>
            <div className="notification-wrap">
              <button
                className="icon-button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={19} />{!notificationsRead && <i />}
              </button>
              {notificationsOpen && (
                <div className="notification-panel">
                  <div className="notification-heading">
                    <strong>Notifications</strong>
                    <button onClick={markNotificationsRead} disabled={notificationsRead}>
                      {notificationsRead ? 'All read' : 'Mark all read'}
                    </button>
                  </div>
                  {notifications.map((item) => (
                    <button className={notificationsRead ? 'notification-item read' : 'notification-item unread'} key={item.id} onClick={() => { markNotificationsRead(); setActive(item.page); setSearch(''); setNotificationsOpen(false) }}>
                      <span className="notification-mark"><Bell size={15} /></span>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                      {!notificationsRead && <i className="notification-unread-dot" />}
                    </button>
                  ))}
                  {!notifications.length && <p className="search-empty">You’re all caught up.</p>}
                </div>
              )}
            </div>
            <button className="avatar-small" aria-label={profileName}>{profileInitials}</button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <h1>{active === 'Dashboard' ? `Welcome back, ${profileName.split(/\s+/)[0]}!` : active}</h1>
              <p>{active === 'Dashboard' ? `Here’s your financial overview for ${formatMonth(selectedMonth)}` : `Manage your finances for ${formatMonth(selectedMonth)}`}</p>
            </div>
            <label className="month-select" title="Select month">
              <CalendarDays size={15} />
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => event.target.value && setSelectedMonth(event.target.value)}
                aria-label="Select month"
              />
              <ChevronDown size={15} />
            </label>
          </div>

          {active === 'Dashboard' ? (
            <>
              <section className="stat-grid">
                <StatCard icon={<Wallet size={21} />} tone="green" title="Total Income" value={formatMoney(salary)} change="+5%" up />
                <StatCard icon={<ReceiptText size={21} />} tone="red" title="Total Expenses" value={formatMoney(expenseTotal)} change="-8%" />
                <StatCard icon={<WalletCards size={21} />} tone="teal" title="Available Balance" value={formatMoney(balance)} />
                <StatCard icon={<Target size={21} />} tone="violet" title="Monthly Savings" value={formatMoney(Math.max(balance, 0))} />
              </section>

              <section className="dashboard-grid">
                <article className="card expense-overview">
                  <div className="card-title"><h2>Expense Overview</h2><button className="dots" onClick={() => goToPage('Analytics')} aria-label="Open analytics">•••</button></div>
                  <div className="overview-body">
                    <div className="donut-wrap"><Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} /></div>
                    <div className="legend">
                      {allCategories.map((item) => <div key={item.name}><span style={{ background: item.color }} />{item.name}<strong>{expenseTotal ? `${Math.round((categoryTotals[item.name] / expenseTotal) * 100)}%` : '0%'}</strong></div>)}
                    </div>
                  </div>
                </article>

                <article className="card trend-card">
                  <div className="card-title"><h2>Last 7 Days Expenses</h2><button className="link-button" onClick={() => goToPage('Analytics')}>View Details →</button></div>
                  <div className="line-wrap"><Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatMoney(ctx.parsed.y) } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => `₹${v / 1000}k` } } } }} /></div>
                </article>

                <button className="card insight-card clickable-card" onClick={() => goToPage('Transactions', highestCategory.name)}>
                  <div className="insight-icon red"><ReceiptText size={18} /></div>
                  <div><small>Highest Spending</small><strong>{highestCategory.amount ? highestCategory.name : 'No expenses yet'}</strong><span>{formatMoney(highestCategory.amount)} · {expenseTotal ? `${Math.round(highestCategory.amount / expenseTotal * 100)}% of total` : 'Add your first expense'}</span></div>
                  <ChevronDown className="card-chevron" size={16} />
                </button>
                <button className="card insight-card clickable-card" onClick={() => goToPage('Savings Goals')}>
                  <div className="insight-icon orange"><PiggyBank size={18} /></div>
                  <div><small>Savings Goals Progress</small><strong>{goalProgress}%</strong><span>{formatMoney(goalSavedTotal)} / {formatMoney(goalTargetTotal)}</span></div>
                  <div className="progress"><i style={{ width: `${goalProgress}%` }} /></div>
                  <ChevronDown className="card-chevron" size={16} />
                </button>
                <button className="card insight-card bill-card clickable-card" onClick={() => goToPage('Expenses', 'Bills')}>
                  <div className="insight-icon blue"><CalendarDays size={18} /></div>
                  <div><small>Bills This Month</small><strong>{formatMoney(categoryTotals.Bills)}</strong><span>View bill expenses</span></div>
                  <ChevronDown className="card-chevron" size={16} />
                </button>
              </section>

              <section className="bottom-grid">
                <article className="card transactions">
                  <div className="card-title"><h2>Recent Transactions</h2><button className="link-button" onClick={() => goToPage('Transactions')}>View All →</button></div>
                  {monthlyExpenses.slice(0, 4).map((item) => (
                    <button className="transaction transaction-button" key={item.id} onClick={() => goToPage(item.income ? 'Salary & Income' : 'Transactions', item.income ? '' : item.name)}>
                      <span className={item.income ? 'tx-icon income' : 'tx-icon'}>{item.income ? <TrendingUp size={17} /> : <TrendingDown size={17} />}</span>
                      <div><strong>{item.name}</strong><small>{item.category} · {formatDate(item.date)}</small></div>
                      <b className={item.income ? 'positive' : 'negative'}>{item.income ? '+' : '-'}{formatMoney(item.amount)}</b>
                      <ChevronDown className="row-chevron" size={14} />
                    </button>
                  ))}
                </article>
                <article className="card insight-panel">
                  <h2>Smart Insights <span className="sparkle">✦</span></h2>
                  <div className="smart-insight-list">
                    {smartInsights.map((insight, index) => (
                      <button key={insight.text} onClick={() => goToPage(insight.page, insight.query || '')}>
                        <span className={`check-mark insight-${index}`}>✓</span>
                        <span>{insight.text}</span>
                        <ChevronDown size={14} className="insight-arrow" />
                      </button>
                    ))}
                  </div>
                </article>
              </section>
            </>
          ) : (
            <Page
              active={active}
              salary={salary}
              salaryRecord={salaryRecord}
              incomeByMonth={incomeByMonth}
              expenses={monthlyExpenses}
              allExpenses={expenses}
              selectedMonth={selectedMonth}
              expenseTotal={expenseTotal}
              balance={balance}
              search={search}
              budgets={budgets}
              setBudgets={setBudgets}
              goals={goals}
              setGoals={setGoals}
              recurringBills={recurringBills}
              setRecurringBills={setRecurringBills}
              setNotificationsRead={setNotificationsRead}
              profile={profile}
              setProfile={setProfile}
              categories={allCategories}
              customCategories={customCategories}
              setCustomCategories={setCustomCategories}
              reminderDays={reminderDays}
              setReminderDays={setReminderDays}
              remindersEnabled={remindersEnabled}
              setRemindersEnabled={setRemindersEnabled}
              notificationSoundEnabled={notificationSoundEnabled}
              setNotificationSoundEnabled={setNotificationSoundEnabled}
              playNotificationSound={playNotificationSound}
              isInstalled={isInstalled}
              installAvailable={Boolean(installPrompt)}
              installMessage={installMessage}
              installApp={installApp}
              setExpenses={setExpenses}
              setIncomeByMonth={setIncomeByMonth}
              setModal={setModal}
              openExpenseForm={openExpenseForm}
              setContributionGoalId={setContributionGoalId}
              dark={dark}
              setDark={setDark}
            />
          )}
        </div>
      </main>

      {active === 'Dashboard' && (
        <div className="floating-actions">
          <button onClick={() => setModal('salary')}><Wallet size={18} />Add Salary</button>
          <button onClick={() => openExpenseForm()}><Plus size={18} />Add Expense</button>
        </div>
      )}

      {(modal === 'expense' || modal === 'edit-expense') && (
        <Modal title={editingExpense ? 'Edit Expense' : 'Add Expense'} onClose={() => { setModal(null); setEditingExpense(null) }}>
          <form onSubmit={saveExpense} className="entry-form">
            <label>Expense Name<input name="name" placeholder="e.g. Movie" defaultValue={editingExpense?.name || ''} required /></label>
            <label>Amount (₹)<input name="amount" type="number" min="1" placeholder="500" defaultValue={editingExpense?.amount || ''} required /></label>
            <label>Category<select name="category" defaultValue={editingExpense?.category || allCategories[0].name}>{allCategories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
            <label>Payment Method<select name="method" defaultValue={editingExpense?.method || 'UPI'}><option>UPI</option><option>Cash</option><option>Bank</option><option>Card</option></select></label>
            <label>Date<input name="date" type="date" defaultValue={editingExpense?.date || `${selectedMonth}-01`} required /></label>
            <label>Notes (Optional)<input name="notes" placeholder="Enter notes..." defaultValue={editingExpense?.notes || ''} /></label>
            <div className="form-actions"><button type="button" onClick={() => { setModal(null); setEditingExpense(null) }}>Cancel</button><button className="primary" type="submit"><Plus size={16} />{editingExpense ? 'Update Expense' : 'Save Expense'}</button></div>
          </form>
        </Modal>
      )}

      {modal === 'salary' && (
        <Modal title="Add Salary" onClose={() => setModal(null)}>
          <form onSubmit={saveSalary} className="entry-form">
            <label>Basic Salary (₹)<input name="basic" type="number" min="0" defaultValue={salaryRecord?.basic || ''} required /></label>
            <label>Bonus (Optional)<input name="bonus" type="number" min="0" defaultValue={salaryRecord?.bonus || ''} /></label>
            <label>Other Income (Optional)<input name="other" type="number" min="0" defaultValue={salaryRecord?.other || ''} /></label>
            <label>Received Date<input name="receivedDate" type="date" defaultValue={salaryRecord?.receivedDate || `${selectedMonth}-01`} /></label>
            <div className="form-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="primary" type="submit"><Plus size={16} />Save Salary</button></div>
          </form>
        </Modal>
      )}
      {modal === 'goal-contribution' && (
        <Modal title="Add Savings Contribution" onClose={() => { setModal(null); setContributionGoalId(null) }}>
          <form onSubmit={saveGoalContribution} className="entry-form single-field">
            <label>Contribution Amount (₹)<input name="amount" type="number" min="1" placeholder="e.g. 1000" required autoFocus /></label>
            <div className="form-actions"><button type="button" onClick={() => { setModal(null); setContributionGoalId(null) }}>Cancel</button><button className="primary" type="submit"><Plus size={16} />Add Contribution</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Page({
  active, salary, salaryRecord, incomeByMonth, expenses, allExpenses, expenseTotal, search, selectedMonth,
  budgets, setBudgets, goals, setGoals, recurringBills, setRecurringBills, setNotificationsRead, profile, setProfile,
  categories, customCategories, setCustomCategories,
  reminderDays, setReminderDays, remindersEnabled, setRemindersEnabled,
  notificationSoundEnabled, setNotificationSoundEnabled, playNotificationSound,
  isInstalled, installAvailable, installMessage, installApp,
  setExpenses, setIncomeByMonth, setModal, setDark, openExpenseForm, setContributionGoalId,
}) {
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterMethod, setFilterMethod] = useState('All')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  const [pageMessage, setPageMessage] = useState('')
  const filtered = expenses.filter((item) =>
    `${item.name} ${item.category} ${item.method}`.toLowerCase().includes(search.toLowerCase())
  ).filter((item) =>
    (filterCategory === 'All' || item.category === filterCategory)
    && (filterMethod === 'All' || item.method === filterMethod)
    && (!filterFrom || item.date >= filterFrom)
    && (!filterTo || item.date <= filterTo)
  )
  const categoryTotals = expenses.filter((item) => !item.income).reduce((totals, item) => {
    const category = categories.some((option) => option.name === item.category) ? item.category : 'Others'
    totals[category] = (totals[category] || 0) + Number(item.amount)
    return totals
  }, {})
  const highestCategory = categories
    .map((item) => ({ ...item, amount: categoryTotals[item.name] || 0 }))
    .sort((a, b) => b.amount - a.amount)[0]

  const removeExpense = (id) => {
    const next = allExpenses.filter((item) => item.id !== id)
    setExpenses(next)
    localStorage.setItem('mymoney-expenses', JSON.stringify(next))
    setNotificationsRead(false)
    localStorage.setItem('mymoney-notifications-read', 'false')
  }
  const editExpense = (item) => openExpenseForm(item)

  if (active === 'Salary & Income') {
    return (
      <div className="page-stack">
        <section className="stat-grid three">
          <StatCard icon={<Wallet size={21} />} tone="green" title="Basic Salary" value={formatMoney(salaryRecord?.basic || 0)} />
          <StatCard icon={<TrendingUp size={21} />} tone="violet" title="Bonus + Other" value={formatMoney(Number(salaryRecord?.bonus || 0) + Number(salaryRecord?.other || 0))} />
          <StatCard icon={<CircleDollarSign size={21} />} tone="teal" title="Total Income" value={formatMoney(salary)} />
        </section>
        <section className="card table-card">
          <div className="card-title"><h2>Income History</h2><button className="primary small-button" onClick={() => setModal('salary')}><Plus size={15} /> Add Income</button></div>
          <div className="table-wrap">
            <table><thead><tr><th>Month</th><th>Basic</th><th>Bonus</th><th>Other</th><th>Total</th></tr></thead>
              <tbody>{Object.entries(incomeByMonth || {}).sort(([a], [b]) => b.localeCompare(a)).map(([month, income]) => (
                <tr key={month}><td>{formatMonth(month)}</td><td>{formatMoney(income.basic)}</td><td>{formatMoney(income.bonus)}</td><td>{formatMoney(income.other)}</td><td><strong>{formatMoney(income.total)}</strong></td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  if (active === 'Expenses') {
    return (
      <section className="card table-card">
        <div className="card-title"><h2>Expenses · {formatMonth(selectedMonth)}</h2><button className="primary small-button" onClick={() => openExpenseForm()}><Plus size={15} /> Add Expense</button></div>
        <TransactionFilters
          categories={categories}
          category={filterCategory} setCategory={setFilterCategory}
          method={filterMethod} setMethod={setFilterMethod}
          from={filterFrom} setFrom={setFilterFrom}
          to={filterTo} setTo={setFilterTo}
          reset={() => { setFilterCategory('All'); setFilterMethod('All'); setFilterFrom(''); setFilterTo('') }}
        />
        <ExpenseTable items={filtered.filter((item) => !item.income)} onEdit={editExpense} onDelete={removeExpense} />
      </section>
    )
  }

  if (active === 'Analytics') {
    const total = expenseTotal || 1
    return (
      <div className="page-stack">
        <section className="stat-grid three">
          <StatCard icon={<ReceiptText size={21} />} tone="red" title="Highest Category" value={highestCategory.amount ? highestCategory.name : '—'} />
          <StatCard icon={<TrendingDown size={21} />} tone="teal" title="Expense Change" value="-8%" />
          <StatCard icon={<WalletCards size={21} />} tone="violet" title="Daily Average" value={formatMoney(Math.round(total / 30))} />
        </section>
        <section className="analytics-grid">
          <article className="card"><div className="card-title"><h2>Monthly Expense Trend</h2></div><div className="analytics-chart"><Line data={{ labels: ['Aug','Sep','Oct','Nov'], datasets: [{ data: [12500,14200,13600,expenseTotal], borderColor:'#4c74ff',backgroundColor:'rgba(76,116,255,.08)',fill:true,tension:.4 }] }} options={{ maintainAspectRatio:false,plugins:{legend:{display:false}} }} /></div></article>
          <article className="card"><div className="card-title"><h2>Category Breakdown</h2></div><div className="analytics-donut"><Doughnut data={{ labels:categories.map((item)=>item.name),datasets:[{data:categories.map((item)=>categoryTotals[item.name] || 0),backgroundColor:categories.map((item)=>item.color),borderWidth:0}] }} options={{ maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},cutout:'62%' }} /></div></article>
        </section>
      </div>
    )
  }

  if (active === 'Budget Planner') {
    const updateBudget = (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const next = budgets.map((budget) => budget.name === data.get('category') ? { ...budget, amount: Number(data.get('amount')) } : budget)
      setBudgets(next)
      localStorage.setItem('mymoney-budgets', JSON.stringify(next))
      setNotificationsRead(false)
      localStorage.setItem('mymoney-notifications-read', 'false')
      event.currentTarget.reset()
    }
    return (
      <div className="page-stack">
        <form className="card budget-form" onSubmit={updateBudget}>
          <h2>Set Monthly Budget <span className="currency-badge">₹ INR</span></h2>
          <select name="category">{budgets.map((item) => <option key={item.name}>{item.name}</option>)}</select>
          <div className="budget-input-wrap"><span aria-hidden="true">₹</span><input name="amount" type="number" min="0" placeholder="Budget amount" aria-label="Monthly budget in Indian rupees" required /></div>
          <button className="primary" type="submit">Update Budget</button>
        </form>
        <section className="budget-grid">
          {budgets.map((budget) => {
            const spent = categoryTotals[budget.name] || 0
            const percent = budget.amount ? Math.round((spent / budget.amount) * 100) : 0
            return <article className={`card budget-card ${percent >= 100 ? 'over-budget' : percent >= 80 ? 'near-budget' : ''}`} key={budget.name}>
              <div><strong>{budget.name}</strong><span>{percent}% used</span></div>
              <b>{formatMoney(spent)} <small>/ {formatMoney(budget.amount)}</small></b>
              <div className="budget-progress"><i style={{ width: `${Math.min(percent, 100)}%`, background: percent >= 80 ? '#ed6654' : '#25a96d' }} /></div>
              <small>{percent >= 100 ? `${formatMoney(spent - budget.amount)} over budget` : `${formatMoney(Math.max(budget.amount - spent, 0))} remaining`}</small>
              {percent >= 80 && <p className="budget-warning">{percent >= 100 ? 'Budget limit exceeded' : 'Approaching budget limit'}</p>}
            </article>
          })}
        </section>
      </div>
    )
  }

  if (active === 'Savings Goals') {
    const addGoal = (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const next = [...goals, { id: Date.now(), name: data.get('name'), target: Number(data.get('target')), saved: Number(data.get('saved') || 0), date: data.get('date') }]
      setGoals(next)
      localStorage.setItem('mymoney-goals', JSON.stringify(next))
      event.currentTarget.reset()
    }
    return (
      <div className="page-stack">
        <form className="card goal-form" onSubmit={addGoal}>
          <h2>Create Savings Goal</h2>
          <input name="name" placeholder="Goal name" required />
          <input name="target" type="number" min="1" placeholder="Target amount" required />
          <input name="saved" type="number" min="0" placeholder="Saved amount" />
          <input name="date" type="date" required />
          <button className="primary" type="submit"><Plus size={16} /> Create Goal</button>
        </form>
        <section className="goal-grid">
          {goals.map((goal) => {
            const percent = goal.target ? Math.round((goal.saved / goal.target) * 100) : 0
            return <article className="card goal-card" key={goal.id}>
              <span className="goal-icon"><PiggyBank size={20} /></span><h3>{goal.name}</h3>
              <b>{formatMoney(goal.saved)} <small>/ {formatMoney(goal.target)}</small></b>
              <div className="budget-progress"><i style={{ width: `${Math.min(percent, 100)}%` }} /></div>
              <div className="goal-meta"><span>{percent}% complete</span><span>{formatMoney(Math.max(goal.target - goal.saved, 0))} left</span></div>
              <button className="contribute-button" onClick={() => { setContributionGoalId(goal.id); setModal('goal-contribution') }}><Plus size={14} /> Add contribution</button>
            </article>
          })}
        </section>
      </div>
    )
  }

  if (active === 'Categories') {
    const addCategory = (event) => {
      event.preventDefault()
      const name = new FormData(event.currentTarget).get('name').trim()
      if (!name) {
        setPageMessage('Enter a category name.')
        return
      }
      if (categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        setPageMessage('That category already exists.')
        return
      }
      const next = [...customCategories, name]
      setCustomCategories(next)
      localStorage.setItem('mymoney-custom-categories', JSON.stringify(next))
      if (!budgets.some((budget) => budget.name === name)) {
        const nextBudgets = [...budgets, { name, amount: 0 }]
        setBudgets(nextBudgets)
        localStorage.setItem('mymoney-budgets', JSON.stringify(nextBudgets))
      }
      setPageMessage(`${name} category added.`)
      event.currentTarget.reset()
    }
    const deleteCategory = (name) => {
      if (allExpenses.some((item) => item.category === name)) {
        setPageMessage(`Move or remove existing ${name} expenses before deleting this category.`)
        return
      }
      const next = customCategories.filter((item) => item !== name)
      setCustomCategories(next)
      localStorage.setItem('mymoney-custom-categories', JSON.stringify(next))
      const nextBudgets = budgets.filter((item) => item.name !== name)
      setBudgets(nextBudgets)
      localStorage.setItem('mymoney-budgets', JSON.stringify(nextBudgets))
      setPageMessage(`${name} category removed.`)
    }
    return (
      <div className="page-stack">
        <form className="card category-form" onSubmit={addCategory}>
          <div><h2>Create a category</h2><p>Use your own labels to organize expenses.</p></div>
          <input name="name" maxLength="32" placeholder="e.g. Pets, Gifts, Subscriptions" required />
          <button className="primary" type="submit"><Plus size={15} />Add category</button>
        </form>
        {pageMessage && <p className="page-message" role="status">{pageMessage}</p>}
        <section className="category-grid">
          {categories.map((category) => (
            <article className="card category-card" key={category.name}>
              <span style={{ background: category.color }} />
              <strong>{category.name}</strong>
              <small>{allExpenses.filter((item) => !item.income && item.category === category.name).length} transactions</small>
              {customCategories.includes(category.name) && <button className="delete-button" onClick={() => deleteCategory(category.name)} aria-label={`Delete ${category.name}`}><Trash2 size={15} /></button>}
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (active === 'Recurring Bills') {
    const addRecurringBill = (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const next = [...recurringBills, {
        id: Date.now(),
        name: data.get('name'),
        amount: Number(data.get('amount')),
        category: data.get('category'),
        day: Number(data.get('day')),
        method: data.get('method'),
        active: true,
      }]
      setRecurringBills(next)
      localStorage.setItem('mymoney-recurring-bills', JSON.stringify(next))
      setNotificationsRead(false)
      localStorage.setItem('mymoney-notifications-read', 'false')
      event.currentTarget.reset()
    }
    const updateRecurringBill = (id, updates) => {
      const next = recurringBills.map((bill) => bill.id === id ? { ...bill, ...updates } : bill)
      setRecurringBills(next)
      localStorage.setItem('mymoney-recurring-bills', JSON.stringify(next))
      setNotificationsRead(false)
      localStorage.setItem('mymoney-notifications-read', 'false')
    }
    const deleteRecurringBill = (id) => {
      const next = recurringBills.filter((bill) => bill.id !== id)
      setRecurringBills(next)
      localStorage.setItem('mymoney-recurring-bills', JSON.stringify(next))
    }
    return (
      <div className="page-stack">
        <form className="card recurring-form" onSubmit={addRecurringBill}>
          <h2>Add recurring bill</h2>
          <input name="name" placeholder="Bill name (e.g. Rent)" required />
          <input name="amount" type="number" min="1" placeholder="Amount (₹)" required />
          <select name="category">{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select>
          <input name="day" type="number" min="1" max="31" placeholder="Due day (1–31)" aria-label="Due day of month" required />
          <select name="method"><option>UPI</option><option>Cash</option><option>Bank</option><option>Card</option></select>
          <button className="primary" type="submit"><Plus size={15} />Add bill</button>
        </form>
        <section className="recurring-list">
          {recurringBills.length ? recurringBills.map((bill) => (
            <article className={`card recurring-card ${bill.active ? '' : 'inactive'}`} key={bill.id}>
              <span className="recurring-icon"><Repeat2 size={19} /></span>
              <div className="recurring-details"><strong>{bill.name}</strong><small>{bill.category} · {bill.method} · Due monthly on day {bill.day}</small></div>
              <b>{formatMoney(bill.amount)}</b>
              <button className={bill.active ? 'recurring-toggle active' : 'recurring-toggle'} onClick={() => updateRecurringBill(bill.id, { active: !bill.active })}>{bill.active ? 'Active' : 'Paused'}</button>
              <button className="delete-button" onClick={() => deleteRecurringBill(bill.id)} aria-label={`Delete ${bill.name}`}><Trash2 size={15} /></button>
            </article>
          )) : <div className="card no-results">No recurring bills yet. Add rent, EMI or subscriptions above.</div>}
        </section>
      </div>
    )
  }

  if (active === 'Transactions') {
    return <section className="card table-card">
      <div className="card-title"><h2>Transactions · {formatMonth(selectedMonth)}</h2></div>
      <TransactionFilters
        categories={categories}
        category={filterCategory} setCategory={setFilterCategory}
        method={filterMethod} setMethod={setFilterMethod}
        from={filterFrom} setFrom={setFilterFrom}
        to={filterTo} setTo={setFilterTo}
        reset={() => { setFilterCategory('All'); setFilterMethod('All'); setFilterFrom(''); setFilterTo('') }}
      />
      <ExpenseTable items={filtered} onEdit={editExpense} onDelete={removeExpense} />
    </section>
  }

  if (active === 'Reports') {
    const year = formatYear(selectedMonth)
    const yearMonthKeys = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
    const yearExpensesByMonth = yearMonthKeys.map((month) => allExpenses
      .filter((item) => !item.income && item.date?.slice(0, 7) === month)
      .reduce((sum, item) => sum + Number(item.amount), 0))
    const yearIncomeByMonth = yearMonthKeys.map((month) => Number(incomeByMonth[month]?.total || 0))
    const yearExpenseTotal = yearExpensesByMonth.reduce((sum, amount) => sum + amount, 0)
    const yearIncomeTotal = yearIncomeByMonth.reduce((sum, amount) => sum + amount, 0)
    const previousMonth = previousMonthKey(selectedMonth)
    const previousMonthExpenses = allExpenses.filter((item) => !item.income && item.date?.slice(0, 7) === previousMonth)
      .reduce((sum, item) => sum + Number(item.amount), 0)
    const monthlyTransactions = [
      ...allExpenses.filter((item) => !item.income && item.date?.slice(0, 7) === selectedMonth),
      ...(salaryRecord ? [{ name: 'Salary & Income', amount: salaryRecord.total, category: 'Income', date: salaryRecord.receivedDate, method: 'Bank' }] : []),
    ]
    const yearlyTransactions = [
      ...allExpenses.filter((item) => !item.income && item.date?.slice(0, 4) === year),
      ...Object.entries(incomeByMonth).filter(([month]) => month.startsWith(year)).map(([month, income]) => ({
        name: 'Salary & Income', amount: income.total, category: 'Income', date: income.receivedDate || `${month}-01`, method: 'Bank',
      })),
    ]
    const createCsvDownload = (transactions, filename) => {
      const rows = [['Name','Amount','Category','Date','Payment Method'], ...transactions.map((item) => [item.name,item.amount,item.category,item.date,item.method])]
      const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }
    const downloadCsv = () => createCsvDownload(monthlyTransactions, `mymoney-${selectedMonth}.csv`)
    const downloadYearlyCsv = () => createCsvDownload(yearlyTransactions, `mymoney-${year}-yearly.csv`)
    const downloadBackup = () => {
      const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        data: { expenses: allExpenses, incomes: incomeByMonth, budgets, goals, recurringBills, profile, customCategories, reminderDays, remindersEnabled, notificationSoundEnabled },
      }
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `mymoney-backup-${dateKey(new Date())}.json`
      link.click()
      URL.revokeObjectURL(url)
    }
    const restoreBackup = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return
      try {
        const backup = JSON.parse(await file.text())
        const data = backup.data || backup
        if (!Array.isArray(data.expenses) || !Array.isArray(data.budgets) || !Array.isArray(data.goals)
          || !Array.isArray(data.recurringBills) || !data.incomes || typeof data.incomes !== 'object') {
          throw new Error('This file is not a valid MyMoney backup.')
        }
        setExpenses(data.expenses)
        setIncomeByMonth(data.incomes)
        setBudgets(data.budgets)
        setGoals(data.goals)
        setRecurringBills(data.recurringBills)
        const restoredCategories = Array.isArray(data.customCategories)
          ? [...new Set(data.customCategories.filter((name) => typeof name === 'string').map((name) => name.trim()).filter(Boolean))]
          : []
        const restoredReminderDays = Math.min(30, Math.max(0, Number(data.reminderDays) || 7))
        const restoredNotificationSound = data.notificationSoundEnabled !== false
        setCustomCategories(restoredCategories)
        setReminderDays(restoredReminderDays)
        setRemindersEnabled(data.remindersEnabled !== false)
        setNotificationSoundEnabled(restoredNotificationSound)
        if (data.profile && typeof data.profile === 'object') setProfile(data.profile)
        localStorage.setItem('mymoney-expenses', JSON.stringify(data.expenses))
        localStorage.setItem('mymoney-incomes', JSON.stringify(data.incomes))
        localStorage.setItem('mymoney-budgets', JSON.stringify(data.budgets))
        localStorage.setItem('mymoney-goals', JSON.stringify(data.goals))
        localStorage.setItem('mymoney-recurring-bills', JSON.stringify(data.recurringBills))
        localStorage.setItem('mymoney-custom-categories', JSON.stringify(restoredCategories))
        localStorage.setItem('mymoney-reminder-days', String(restoredReminderDays))
        localStorage.setItem('mymoney-reminders-enabled', String(data.remindersEnabled !== false))
        localStorage.setItem('mymoney-notification-sound', String(restoredNotificationSound))
        if (data.profile) localStorage.setItem('mymoney-profile', JSON.stringify(data.profile))
        if (data.profile?.theme) setDark(data.profile.theme === 'Dark')
        setBackupMessage('Backup restored successfully.')
      } catch (error) {
        setBackupMessage(`Could not restore backup: ${error.message}`)
      } finally {
        event.target.value = ''
      }
    }
    return (
      <div className="page-stack">
        <section className="report-grid">
          <article className="card report-card"><CalendarDays size={28} /><h3>Monthly Report</h3><p>{formatMonth(selectedMonth)} · Income {formatMoney(salary)} · Expenses {formatMoney(expenseTotal)}</p><button className="primary" onClick={downloadCsv}><Download size={16} /> Download monthly CSV</button></article>
          <article className="card report-card"><BarChart3 size={28} /><h3>Yearly Report</h3><p>{year} · Income {formatMoney(yearIncomeTotal)} · Expenses {formatMoney(yearExpenseTotal)}</p><div className="report-actions"><button className="secondary-button" onClick={downloadYearlyCsv}><Download size={15} /> Yearly CSV</button><button className="secondary-button" onClick={() => window.print()}>Print Report</button></div></article>
        </section>
        <section className="report-summary">
          <article className="card"><small>Selected month balance</small><strong>{formatMoney(salary - expenseTotal)}</strong></article>
          <article className="card"><small>Previous month expenses</small><strong>{formatMoney(previousMonthExpenses)}</strong></article>
          <article className="card"><small>Expense change vs previous month</small><strong>{previousMonthExpenses ? `${Math.round(((expenseTotal - previousMonthExpenses) / previousMonthExpenses) * 100)}%` : 'No previous data'}</strong></article>
        </section>
        <article className="card yearly-chart-card">
          <div className="card-title"><h2>{year} income & expense by month</h2></div>
          <div className="yearly-chart"><Bar data={{
            labels: yearMonthKeys.map((month) => formatMonth(month).split(' ')[0].slice(0, 3)),
            datasets: [
              { label: 'Income', data: yearIncomeByMonth, backgroundColor: '#24b47e', borderRadius: 4 },
              { label: 'Expenses', data: yearExpensesByMonth, backgroundColor: '#4c74ff', borderRadius: 4 },
            ],
          }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatMoney(value) } } } }} /></div>
        </article>
        <section className="card backup-card">
          <div><h2>Local data backup</h2><p>Download a JSON copy or restore your data from a previous MyMoney backup.</p></div>
          <div className="backup-actions">
            <button className="primary" onClick={downloadBackup}><Download size={16} /> Download backup</button>
            <label className="secondary-button"><Upload size={15} /> Restore backup<input type="file" accept=".json,application/json" onChange={restoreBackup} /></label>
          </div>
          {backupMessage && <p className="backup-message" role="status">{backupMessage}</p>}
        </section>
      </div>
    )
  }

  if (active === 'AI Assistant') {
    return <AIPage salary={salary} expenseTotal={expenseTotal} />
  }

  if (active === 'Calculator') {
    return <CalculatorPage />
  }

  if (active === 'Settings') {
    const saveProfile = (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const next = { name: data.get('name'), email: data.get('email'), currency: data.get('currency'), theme: data.get('theme') }
      const days = Number(data.get('reminderDays'))
      const enabled = data.has('remindersEnabled')
      const soundEnabled = data.has('notificationSoundEnabled')
      setProfile(next)
      localStorage.setItem('mymoney-profile', JSON.stringify(next))
      setReminderDays(days)
      setRemindersEnabled(enabled)
      setNotificationSoundEnabled(soundEnabled)
      localStorage.setItem('mymoney-reminder-days', String(days))
      localStorage.setItem('mymoney-reminders-enabled', String(enabled))
      localStorage.setItem('mymoney-notification-sound', String(soundEnabled))
      if (next.theme === 'Dark') setDark(true)
      if (next.theme === 'Light') setDark(false)
      setPageMessage('Settings saved.')
    }
    const removeDemoData = () => {
      if (!window.confirm('Remove the starter sample transactions and goals? Other data will remain.')) return
      const sampleTransactions = [
        { id: 1, name: 'Zomato', amount: 350, category: 'Food', date: '2026-11-16' },
        { id: 2, name: 'Salary Received', amount: 35000, category: 'Income', date: '2026-11-01' },
        { id: 3, name: 'Mobile Recharge', amount: 299, category: 'Bills', date: '2026-11-15' },
      ]
      const nextExpenses = allExpenses.filter((item) => !item.demo && !sampleTransactions.some((sample) =>
        item.id === sample.id && item.name === sample.name && Number(item.amount) === sample.amount
        && item.category === sample.category && item.date === sample.date
      ))
      const sampleGoal = (goal) => goal.demo || (goal.id === 1 && goal.name === 'iPhone' && Number(goal.target) === 90000)
        || (goal.id === 2 && goal.name === 'Emergency Fund' && Number(goal.target) === 50000)
      const nextGoals = goals.filter((goal) => !sampleGoal(goal))
      const nextIncomes = Object.fromEntries(Object.entries(incomeByMonth).filter(([, income]) => !income.demo))
      setExpenses(nextExpenses)
      setGoals(nextGoals)
      setIncomeByMonth(nextIncomes)
      localStorage.setItem('mymoney-expenses', JSON.stringify(nextExpenses))
      localStorage.setItem('mymoney-goals', JSON.stringify(nextGoals))
      localStorage.setItem('mymoney-incomes', JSON.stringify(nextIncomes))
      setPageMessage('Starter sample transactions and goals removed.')
    }
    return (
      <div className="page-stack">
        <form className="card settings-card" onSubmit={saveProfile}>
          <h2>Profile & Preferences</h2>
          <label>Full Name<input name="name" defaultValue={profile.name} required /></label>
          <label>Email<input name="email" type="email" defaultValue={profile.email} required /></label>
          <label>Currency<select name="currency" defaultValue="INR"><option value="INR">Indian Rupee (₹)</option></select></label>
          <label>Theme<select name="theme" defaultValue={profile.theme}><option>Light</option><option>Dark</option></select></label>
          <label>Bill reminder lead time (days)<input name="reminderDays" type="number" min="0" max="30" defaultValue={reminderDays} required /></label>
          <label className="checkbox-setting"><input name="remindersEnabled" type="checkbox" defaultChecked={remindersEnabled} />Enable recurring bill reminders</label>
          <div className="notification-sound-setting">
            <label className="checkbox-setting"><input name="notificationSoundEnabled" type="checkbox" defaultChecked={notificationSoundEnabled} />Play a tink for new notifications</label>
            <button type="button" className="secondary-button" onClick={() => playNotificationSound(true)}>Test sound</button>
          </div>
          <button className="primary" type="submit">Save Settings</button>
        </form>
        {pageMessage && <p className="page-message" role="status">{pageMessage}</p>}
        <section className="card app-install-card">
          <span className="app-install-icon"><Smartphone size={22} /></span>
          <div><h2>Install MyMoney</h2><p>{isInstalled ? 'App is installed on this device.' : 'Install the web app for an app-like experience and offline access.'}</p>{installMessage && <small>{installMessage}</small>}</div>
          {!isInstalled && <button className="primary" onClick={installApp}>{installAvailable ? 'Install now' : 'Install options'}</button>}
        </section>
        <section className="card clear-demo-card">
          <div><h2>Starter data</h2><p>Remove the included sample transactions and starter savings goals. Your other entries will stay untouched.</p></div>
          <button className="danger-button" onClick={removeDemoData}><Eraser size={15} />Remove sample data</button>
        </section>
      </div>
    )
  }

  return null
}

function TransactionFilters({ categories, category, setCategory, method, setMethod, from, setFrom, to, setTo, reset }) {
  return (
    <div className="filters-bar">
      <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
        <option>All</option>{categories.map((item) => <option key={item.name}>{item.name}</option>)}<option>Income</option>
      </select>
      <select aria-label="Filter by payment method" value={method} onChange={(event) => setMethod(event.target.value)}>
        <option>All</option><option>UPI</option><option>Cash</option><option>Bank</option><option>Card</option>
      </select>
      <label>From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>To <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      <button onClick={reset}><RotateCcw size={14} /> Reset</button>
    </div>
  )
}

function ExpenseTable({ items, onEdit, onDelete }) {
  if (!items.length) return <div className="no-results">No transactions found.</div>
  return <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Category</th><th>Payment</th><th>Date</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.category}</td><td>{item.method}</td><td>{formatDate(item.date)}</td><td className={item.income ? 'positive' : 'negative'}>{item.income ? '+' : '-'}{formatMoney(item.amount)}</td><td className="table-actions">{!item.income && <><button className="edit-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={15} /></button><button className="delete-button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.name}`}><Trash2 size={15} /></button></>}</td></tr>)}</tbody></table></div>
}

function AIPage({ salary, expenseTotal }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('Ask about your spending, savings or monthly budget.')
  const submit = (event) => {
    event.preventDefault()
    const text = question.trim()
    if (!text) return
    const lower = text.toLowerCase()
    if (lower.includes('spend') || lower.includes('kharch') || lower.includes('where')) {
      setAnswer(`Your highest spending category is Shopping. This month, approximately 32% of ${formatMoney(expenseTotal)} has gone to Shopping.`)
    } else if (lower.includes('save') || lower.includes('savings')) {
      setAnswer(`Your available balance is ${formatMoney(salary - expenseTotal)}. Consider saving at least 20% of income, which is ${formatMoney(Math.round(salary * 0.2))}.`)
    } else if (lower.includes('budget')) {
      setAnswer(`Your current expense total is ${formatMoney(expenseTotal)}. Review Food and Shopping budgets first to free up more savings.`)
    } else {
      setAnswer(`Based on your current data, income is ${formatMoney(salary)}, expenses are ${formatMoney(expenseTotal)}, and the remaining balance is ${formatMoney(salary - expenseTotal)}.`)
    }
  }
  return (
    <section className="card ai-card">
      <div className="ai-header"><span><Target size={22} /></span><div><h2>MyMoney AI Assistant</h2><p>Rule-based financial insights from your local data</p></div></div>
      <div className="ai-answer">{answer}</div>
      <form className="ai-form" onSubmit={submit}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask: Where did I spend the most?" /><button type="submit"><Send size={17} /></button></form>
      <div className="suggestions"><button onClick={() => setQuestion('Where did I spend the most?')}>Highest spending</button><button onClick={() => setQuestion('How much should I save?')}>Saving suggestion</button><button onClick={() => setQuestion('How is my budget?')}>Budget review</button></div>
    </section>
  )
}

function CalculatorPage() {
  const [display, setDisplay] = useState('0')
  const [storedValue, setStoredValue] = useState(null)
  const [operator, setOperator] = useState(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const calculate = (left, right, operation) => {
    const result = operation === '+' ? left + right
      : operation === '−' ? left - right
        : operation === '×' ? left * right
          : right === 0 ? null : left / right
    return result === null || !Number.isFinite(result) ? null : Number(result.toPrecision(12))
  }
  const clear = () => {
    setDisplay('0')
    setStoredValue(null)
    setOperator(null)
    setWaitingForOperand(false)
  }
  const inputDigit = (digit) => {
    if (display === 'Error') {
      setDisplay(digit)
      setStoredValue(null)
      setOperator(null)
      setWaitingForOperand(false)
    } else {
      setDisplay(waitingForOperand || display === '0' ? digit : `${display}${digit}`)
      setWaitingForOperand(false)
    }
  }
  const inputDecimal = () => {
    if (display === 'Error') {
      setDisplay('0.')
      setStoredValue(null)
      setOperator(null)
      setWaitingForOperand(false)
    } else if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
    } else if (!display.includes('.')) {
      setDisplay(`${display}.`)
    }
  }
  const chooseOperator = (nextOperator) => {
    if (display === 'Error') return
    const inputValue = Number(display)
    if (storedValue === null) {
      setStoredValue(inputValue)
    } else if (operator && !waitingForOperand) {
      const result = calculate(storedValue, inputValue, operator)
      if (result === null) {
        setDisplay('Error')
        setStoredValue(null)
        setOperator(null)
        setWaitingForOperand(true)
        return
      }
      setStoredValue(result)
      setDisplay(String(result))
    }
    setOperator(nextOperator)
    setWaitingForOperand(true)
  }
  const equals = () => {
    if (storedValue === null || !operator || display === 'Error') return
    const result = calculate(storedValue, Number(display), operator)
    setDisplay(result === null ? 'Error' : String(result))
    setStoredValue(null)
    setOperator(null)
    setWaitingForOperand(true)
  }
  const toggleSign = () => {
    if (display !== 'Error' && Number(display) !== 0) setDisplay(String(Number(display) * -1))
  }
  const applyPercent = () => {
    if (display !== 'Error') setDisplay(String(Number(display) / 100))
    setWaitingForOperand(false)
  }
  const removeLastDigit = () => {
    if (display === 'Error') return
    if (waitingForOperand && operator) {
      setDisplay('0')
      setWaitingForOperand(false)
      return
    }
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0')
    setWaitingForOperand(false)
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault()
        inputDigit(event.key)
      } else if (event.key === '.') {
        event.preventDefault()
        inputDecimal()
      } else if (event.key === '+' || event.key === '-') {
        event.preventDefault()
        chooseOperator(event.key === '-' ? '−' : event.key)
      } else if (event.key === '*' || event.key === '/') {
        event.preventDefault()
        chooseOperator(event.key === '*' ? '×' : '÷')
      } else if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault()
        equals()
      } else if (event.key === 'Escape') {
        clear()
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        removeLastDigit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const keys = [
    { label: 'AC', action: clear, kind: 'utility' },
    { label: '±', action: toggleSign, kind: 'utility' },
    { label: '%', action: applyPercent, kind: 'utility' },
    { label: 'DEL', action: removeLastDigit, kind: 'utility' },
    { label: '7', action: () => inputDigit('7') },
    { label: '8', action: () => inputDigit('8') },
    { label: '9', action: () => inputDigit('9') },
    { label: '÷', action: () => chooseOperator('÷'), kind: 'operator' },
    { label: '4', action: () => inputDigit('4') },
    { label: '5', action: () => inputDigit('5') },
    { label: '6', action: () => inputDigit('6') },
    { label: '×', action: () => chooseOperator('×'), kind: 'operator' },
    { label: '1', action: () => inputDigit('1') },
    { label: '2', action: () => inputDigit('2') },
    { label: '3', action: () => inputDigit('3') },
    { label: '−', action: () => chooseOperator('−'), kind: 'operator' },
    { label: '0', action: () => inputDigit('0') },
    { label: '.', action: inputDecimal },
    { label: '+', action: () => chooseOperator('+'), kind: 'operator' },
    { label: '=', action: equals, kind: 'equals' },
  ]

  return (
    <section className="card calculator-card">
      <header className="calculator-heading">
        <div><h2>Quick Calculator</h2><p>Calculate amounts in Indian Rupees. Keyboard input is supported.</p></div>
        <span><Calculator size={22} /></span>
      </header>
      <div className="calculator-display" aria-live="polite">
        <small>{storedValue !== null && operator ? `${storedValue} ${operator}` : 'Ready'}</small>
        <output>₹ {display}</output>
      </div>
      <div className="calculator-keys">
        {keys.map((key) => (
          <button type="button" className={`calculator-key ${key.kind || ''}`} key={key.label} onClick={key.action}>
            {key.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function StatCard({ icon, tone, title, value, change, up }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div><small>{title}</small><strong>{value}</strong>{change && <em className={up ? 'up' : 'down'}>{up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{change}</em>}</div>
    </article>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header"><h2>{title}</h2><button onClick={onClose}><X size={19} /></button></div>
        {children}
      </div>
    </div>
  )
}

export default App
