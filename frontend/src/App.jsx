import { useMemo, useState } from 'react'
import styles from './App.module.css'

const initialTree = [
  {
    id: '1',
    name: 'webide',
    type: 'folder',
    children: [
      {
        id: '2',
        name: 'src',
        type: 'folder',
        children: [
          {
            id: '3',
            name: 'main.py',
            type: 'file',
            language: 'python',
            content: `from flask import Flask\n\napp = Flask(__name__)\n\n@app.get('/health')\ndef health():\n    return {'ok': True}`
          },
          {
            id: '4',
            name: 'utils.py',
            type: 'file',
            language: 'python',
            content: `def format_name(name: str) -> str:\n    return name.strip().title()`
          }
        ]
      },
      {
        id: '5',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        content: '# WebIDE\n\nBrowser-based collaboration workspace.'
      }
    ]
  }
]

const initialMessages = [
  { id: 'm1', user: 'Sarah Kim', initials: 'SK', color: '#a78bfa', text: 'Hey team! Just pushed the auth middleware refactor. Can someone review PR #47?', at: '오후 09:49' },
  { id: 'm2', user: 'Marcus Lee', initials: 'ML', color: '#34d399', text: 'On it. Quick question — keeping the `require_auth` decorator or switching to middleware class?', at: '오후 09:53' },
  { id: 'm3', user: 'Sarah Kim', initials: 'SK', color: '#a78bfa', text: 'Decorator for now. Cleaner for route-level granularity. We can revisit when we add RBAC.', at: '오후 09:56' },
  { id: 'm4', user: 'Jin Park', initials: 'JP', color: '#fb923c', text: 'Looks good. test_main.py coverage is at 87% now 🎉', at: '오후 10:09' },
  { id: 'm5', user: 'Marcus Lee', initials: 'ML', color: '#34d399', text: 'I\'ll add edge cases for expired tokens — should hit 95%+', at: '오후 10:16' }
]

const featureItems = [
  {
    id: 'f1',
    icon: '</>',
    iconClass: 'iconBlue',
    title: 'Smart Code Editor',
    description:
      'Multi-tab editor with syntax highlighting, Tab indentation, and Ctrl+S save. Supports Python, JavaScript, TypeScript, and more.'
  },
  {
    id: 'f2',
    icon: '▢',
    iconClass: 'iconPurple',
    title: 'Real-time Team Chat',
    description:
      'Built-in group chat with per-channel rooms, message search, and highlighted results. Stay in context without switching apps.'
  },
  {
    id: 'f3',
    icon: '⌂',
    iconClass: 'iconGreen',
    title: 'File Explorer',
    description:
      'Organize projects with nested folder trees. Create files and folders, open multiple tabs, and navigate your workspace at a glance.'
  },
  {
    id: 'f4',
    icon: '◌',
    iconClass: 'iconOrange',
    title: 'Live Collaboration',
    description:
      "See who's online, share files, and coordinate changes in real time with your entire team."
  },
  {
    id: 'f5',
    icon: '◍',
    iconClass: 'iconPink',
    title: 'Secure Auth',
    description:
      'JWT-based authentication with hashed passwords. Sign up and sign in from any device, with your session protected end-to-end.'
  },
  {
    id: 'f6',
    icon: '⚡',
    iconClass: 'iconYellow',
    title: 'Instant Setup',
    description:
      'No local install required. Open the browser, sign in, and start coding within seconds. Your files follow you anywhere.'
  }
]

const pricingPlans = [
  {
    id: 'p1',
    name: 'Free',
    price: '₩0',
    period: 'forever',
    description: 'For solo developers and small experiments.',
    features: ['1 active project', '3 team members', 'Community chat', '500 MB storage'],
    cta: 'Get started free',
    highlight: false
  },
  {
    id: 'p2',
    name: 'Team',
    price: '₩15,000',
    period: '/ month per seat',
    description: 'For growing teams who need to move fast together.',
    features: ['Unlimited projects', 'Unlimited members', 'Private channels', '10 GB storage', 'Priority support'],
    cta: 'Start 14-day trial',
    highlight: true
  },
  {
    id: 'p3',
    name: 'Enterprise',
    price: '문의',
    period: '',
    description: 'Custom contracts, SSO, and dedicated infrastructure.',
    features: ['Custom SLA', 'SSO / SAML', 'Audit logs', 'Unlimited storage', 'Dedicated onboarding'],
    cta: 'Contact sales',
    highlight: false
  }
]

function flattenFiles(nodes) {
  return nodes.flatMap((node) =>
    node.type === 'file' ? [node] : flattenFiles(node.children ?? [])
  )
}

function findFolderById(nodes, folderId) {
  for (const node of nodes) {
    if (node.id === folderId && node.type === 'folder') {
      return node
    }

    const childMatch = findFolderById(node.children ?? [], folderId)
    if (childMatch) {
      return childMatch
    }
  }

  return null
}

function insertNodeByFolderId(nodes, folderId, nodeToInsert) {
  return nodes.map((node) => {
    if (node.id === folderId && node.type === 'folder') {
      return {
        ...node,
        children: [...(node.children ?? []), nodeToInsert]
      }
    }

    if (node.type === 'folder') {
      return {
        ...node,
        children: insertNodeByFolderId(node.children ?? [], folderId, nodeToInsert)
      }
    }

    return node
  })
}

function TreeNode({ node, depth, selectedFolderId, expandedFolders, onSelectFolder, onToggleFolder, onOpenFile }) {
  const isFolder = node.type === 'folder'
  const isExpanded = expandedFolders.has(node.id)
  const isSelected = selectedFolderId === node.id

  return (
    <div>
      <button
        type="button"
        className={`${styles.treeRow} ${isSelected ? styles.treeRowSelected : ''} ${depth > 0 ? styles.treeRowNested : ''}`}
        style={{ paddingLeft: `${10 + depth * 12}px` }}
        onClick={() => {
          if (isFolder) {
            onSelectFolder(node.id)
            onToggleFolder(node.id)
          } else {
            onOpenFile(node)
          }
        }}
      >
        <span className={styles.treeCaret}>{isFolder ? (isExpanded ? '▾' : '▸') : '•'}</span>
        <span className={isFolder ? styles.treeFolderName : styles.treeFileName}>{node.name}</span>
      </button>

      {isFolder && isExpanded && (node.children ?? []).length > 0 && (
        <div>
          {(node.children ?? []).map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onSelectFolder={onSelectFolder}
              onToggleFolder={onToggleFolder}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function App() {
  const [isDark, setIsDark] = useState(true)
  const [currentView, setCurrentView] = useState('home')
  const [authMode, setAuthMode] = useState('login')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [openTabs, setOpenTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [messages, setMessages] = useState(initialMessages)
  const [chatInput, setChatInput] = useState('')
  const [tree, setTree] = useState(initialTree)
  const [selectedFolderId, setSelectedFolderId] = useState('1')
  const [expandedFolders, setExpandedFolders] = useState(() => new Set(['1', '2']))
  const [newItemName, setNewItemName] = useState('')

  const files = useMemo(() => flattenFiles(tree), [tree])
  const activeTab = openTabs.find((tab) => tab.id === activeTabId) ?? null
  const selectedFolder = useMemo(() => findFolderById(tree, selectedFolderId) ?? tree[0], [tree, selectedFolderId])

  function openFile(file) {
    if (openTabs.some((tab) => tab.id === file.id)) {
      setActiveTabId(file.id)
      return
    }

    const newTab = {
      id: file.id,
      name: file.name,
      language: file.language ?? 'text',
      content: file.content ?? '',
      modified: false
    }

    setOpenTabs((prev) => [...prev, newTab])
    setActiveTabId(file.id)
  }

  function toggleFolder(folderId) {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  function createExplorerItem(kind) {
    const name = newItemName.trim()
    if (!name) return

    const parentFolder = selectedFolder ?? tree[0]
    if (!parentFolder || parentFolder.type !== 'folder') return

    const id = `node-${Date.now()}`
    const nextNode =
      kind === 'folder'
        ? { id, name, type: 'folder', children: [] }
        : {
            id,
            name,
            type: 'file',
            language: name.endsWith('.md') ? 'markdown' : name.endsWith('.ts') ? 'typescript' : 'text',
            content: ''
          }

    setTree((prev) => insertNodeByFolderId(prev, parentFolder.id, nextNode))
    setExpandedFolders((prev) => new Set(prev).add(parentFolder.id))
    setSelectedFolderId(parentFolder.id)
    setNewItemName('')

    if (nextNode.type === 'file') {
      openFile(nextNode)
    }
  }

  function closeTab(tabId) {
    setOpenTabs((prev) => {
      const idx = prev.findIndex((tab) => tab.id === tabId)
      const next = prev.filter((tab) => tab.id !== tabId)
      if (activeTabId === tabId) {
        setActiveTabId(next[Math.max(0, idx - 1)]?.id ?? null)
      }
      return next
    })
  }

  function updateActiveContent(nextContent) {
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, content: nextContent, modified: true } : tab
      )
    )
  }

  function saveActiveFile() {
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, modified: false } : tab))
    )
  }

  function sendMessage() {
    if (!chatInput.trim()) return

    const newMessage = {
      id: `m-${Date.now()}`,
      user: 'Me',
      text: chatInput.trim(),
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, newMessage])
    setChatInput('')
  }

  function openIdeHome() {
    setCurrentView('ide')
  }

  function openAuth(mode) {
    setAuthMode(mode)
    setAuthForm({ email: '', password: '', confirmPassword: '' })
    setAuthError('')
    setAuthSuccess('')
    setShowAuthModal(true)
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    const email = authForm.email.trim()
    const password = authForm.password
    const confirmPassword = authForm.confirmPassword

    if (!email || !password) {
      setAuthError('이메일과 비밀번호를 입력해 주세요.')
      return
    }

    if (!validateEmail(email)) {
      setAuthError('올바른 이메일 형식이 아닙니다.')
      return
    }

    if (password.length < 8) {
      setAuthError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setAuthError('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setIsSubmittingAuth(true)
    window.setTimeout(() => {
      setIsSubmittingAuth(false)
      setAuthSuccess(authMode === 'login' ? '로그인되었습니다.' : '회원가입이 완료되었습니다.')
      setCurrentView('ide')
      window.setTimeout(() => {
        setShowAuthModal(false)
      }, 500)
    }, 500)
  }

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : styles.light}`}>
      <header className={styles.topbar}>
        <div className={styles.brandWrap}>
          <div className={styles.brandIcon}>{'>'}_</div>
          <div className={styles.brand}>GooIDE</div>
        </div>

        {currentView === 'home' ? (
          <>
            <nav className={styles.topNav}>
              <a href="#features">기능</a>
              <a href="#pricing">요금제</a>
            </nav>
            <div className={styles.topActions}>
              <button className={styles.topTextBtn} onClick={() => setIsDark((v) => !v)}>
                테마변경
              </button>
              <span className={styles.topDivider}>|</span>
              <button className={styles.topTextBtn} onClick={() => openAuth('login')}>
                로그인
              </button>
              <span className={styles.topDivider}>|</span>
              <button className={styles.topTextBtn} onClick={() => openAuth('signup')}>
                무료 시작
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.project}>/ project-alpha</div>
            <div className={styles.topActions}>
              <button className={styles.topTextBtn} onClick={() => setCurrentView('home')}>
                홈으로
              </button>
              <span className={styles.topDivider}>|</span>
              <button className={styles.topTextBtn} title="테마 전환" onClick={() => setIsDark((v) => !v)}>
                테마변경
              </button>
              <span className={styles.topDivider}>|</span>
              <button className={styles.topTextBtn} onClick={() => openAuth('login')}>
                로그인
              </button>
              <span className={styles.topDivider}>|</span>
              <button className={styles.topTextBtn} onClick={() => openAuth('signup')}>
                회원가입
              </button>
            </div>
          </>
        )}
      </header>

      {currentView === 'home' ? (
        <main className={styles.homeWrap}>
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>
              브라우저에서 바로
              <span>함께 코딩하세요</span>
            </h1>
            <p className={styles.heroText}>
              GooIDE는 코드 편집기, 파일 탐색기, 팀 채팅을 하나의 화면에 통합한 브라
              우저 기반 협업 IDE입니다. 설치 없이 즉시 시작하세요.
            </p>
            <div className={styles.heroActions}>
              <button className={styles.primaryBtn} onClick={openIdeHome}>
                무료로 시작하기 →
              </button>
              <button className={styles.ghostBtnLarge} onClick={openIdeHome}>
                데모 보기
              </button>
            </div>
          </section>

          <section id="features" className={styles.featuresSection}>
            <h2 className={styles.featuresTitle}>개발자를 위한 올인원 환경</h2>
            <p className={styles.featuresSubtitle}>도구 간 전환 없이, 하나의 탭에서 모든 작업을 완료하세요.</p>

            <div className={styles.featureGrid}>
              {featureItems.map((item) => (
                <article key={item.id} className={styles.featureCard}>
                  <div className={`${styles.featureIcon} ${styles[item.iconClass]}`}>{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="pricing" className={styles.pricingSection}>
            <h2 className={styles.pricingTitle}>투명한 요금제</h2>
            <p className={styles.pricingSubtitle}>팀 규모에 맞게 선택하세요. 언제든지 변경 가능합니다.</p>

            <div className={styles.pricingGrid}>
              {pricingPlans.map((plan) => (
                <article
                  key={plan.id}
                  className={`${styles.pricingCard} ${plan.highlight ? styles.pricingCardHighlight : ''}`}
                >
                  {plan.highlight && <div className={styles.planBadge}>가장 인기</div>}

                  <div className={styles.planName}>{plan.name}</div>
                  <div className={styles.planPriceRow}>
                    <span className={styles.planPrice}>{plan.price}</span>
                    {plan.period && <span className={styles.planPeriod}>{plan.period}</span>}
                  </div>
                  <p className={styles.planDescription}>{plan.description}</p>

                  <ul className={styles.planFeatureList}>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <span className={styles.planCheck}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`${styles.planCta} ${plan.highlight ? styles.planCtaHighlight : ''}`}
                    onClick={() => openAuth('signup')}
                  >
                    {plan.cta}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.ctaSection}>
            <div className={styles.ctaInner}>
              <h2 className={styles.ctaTitle}>지금 바로 시작하세요</h2>
              <p className={styles.ctaSubtitle}>신용카드 없이 무료로 시작할 수 있습니다.</p>
              <button className={styles.ctaButton} onClick={() => openAuth('signup')}>
                무료 계정 만들기 →
              </button>
            </div>
          </section>

          <footer className={styles.homeFooter}>
            <div className={styles.footerBrandWrap}>
              <div className={styles.brandIcon}>{'>'}_</div>
              <span>GooIDE</span>
            </div>
            <p className={styles.footerCopy}>© 2025 GooIDE. 모든 권리 보유.</p>
            <div className={styles.footerLinks}>
              <a href="#">이용약관</a>
              <a href="#">개인정보처리방침</a>
              <a href="#">문의하기</a>
            </div>
          </footer>
        </main>
      ) : (
        <main className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <span className={styles.panelTitle}>탐색기</span>
              <div className={styles.sidebarTools}>
                <button type="button" title="폴더 펼치기/접기" onClick={() => toggleFolder(selectedFolderId)}>
                  ⊞
                </button>
                <button type="button" title="현재 폴더 선택" onClick={() => setSelectedFolderId('1')}>
                  ⊕
                </button>
              </div>
            </div>
            <div className={styles.explorerComposer}>
              <div className={styles.explorerTarget}>
                현재 위치: <strong>{selectedFolder?.name ?? 'webide'}</strong>
              </div>
              <div className={styles.explorerComposerRow}>
                <input
                  className={styles.explorerInput}
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  placeholder="새 파일 또는 폴더 이름"
                />
              </div>
              <div className={styles.explorerComposerActions}>
                <button type="button" className={styles.explorerCreateBtn} onClick={() => createExplorerItem('file')}>
                  파일 추가
                </button>
                <button type="button" className={styles.explorerCreateBtn} onClick={() => createExplorerItem('folder')}>
                  폴더 추가
                </button>
              </div>
            </div>
            <div className={styles.fileList}>
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedFolderId={selectedFolderId}
                  expandedFolders={expandedFolders}
                  onSelectFolder={setSelectedFolderId}
                  onToggleFolder={toggleFolder}
                  onOpenFile={openFile}
                />
              ))}
            </div>
          </aside>

          <section className={styles.editorPane}>
            <div className={styles.tabs}>
              {openTabs.length === 0 ? (
                <div className={styles.emptyTabs}>파일을 선택하세요</div>
              ) : (
                openTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`${styles.tab} ${tab.id === activeTabId ? styles.tabActive : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span>{tab.name}</span>
                    <span
                      className={styles.tabClose}
                      onClick={(event) => {
                        event.stopPropagation()
                        closeTab(tab.id)
                      }}
                    >
                      x
                    </span>
                  </button>
                ))
              )}
            </div>

            {activeTab ? (
              <textarea
                className={styles.editor}
                value={activeTab.content}
                onChange={(event) => updateActiveContent(event.target.value)}
                spellCheck={false}
              />
            ) : (
              <div className={styles.emptyEditor}>
                <div className={styles.emptyIcon}>⌘</div>
                <h2>파일을 열어 편집을 시작하세요</h2>
                <p>왼쪽 탐색기에서 파일을 선택하세요</p>
                <div className={styles.quickFiles}>
                  {files.slice(0, 4).map((file) => (
                    <button key={file.id} className={styles.quickFileBtn} onClick={() => openFile(file)}>
                      {file.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className={styles.chatPane}>
            <div className={styles.chatHeader}>
              <div className={styles.chatChannel}>
                <span className={styles.hash}>#</span>
                <span>general</span>
                <span className={styles.chatOnline}>4 online</span>
              </div>
              <div className={styles.chatTools}>
                <button type="button" title="검색">⌕</button>
                <button type="button" title="확대">↗</button>
              </div>
            </div>
            <div className={styles.messages}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.messageRow} ${message.user === 'Me' ? styles.messageRowOwn : ''}`}
                >
                  <div className={`${styles.messageColumn} ${message.user === 'Me' ? styles.messageColumnOwn : ''}`}>
                    <div className={styles.messageMeta}>
                      <strong>{message.user}</strong>
                      <span>{message.at}</span>
                    </div>
                    <div className={styles.messageBubble}>{message.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.chatBottom}>
              {!isDark ? null : <button className={styles.chatDisabledBtn}>채팅하려면 로그인하세요</button>}
              <form
                className={styles.chatInputRow}
                onSubmit={(event) => {
                  event.preventDefault()
                  sendMessage()
                }}
              >
                <input
                  className={styles.chatInput}
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="#general 메시지 입력..."
                />
                <button className={styles.sendBtn} type="submit">➤</button>
              </form>
            </div>
          </aside>
        </main>
      )}

      {showAuthModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowAuthModal(false)}>
          <div className={styles.authModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{authMode === 'login' ? '로그인' : '회원가입'}</h3>
              <button className={styles.ghostBtn} onClick={() => setShowAuthModal(false)}>
                닫기
              </button>
            </div>
            <form className={styles.authForm} onSubmit={handleAuthSubmit}>
              <input
                className={styles.authInput}
                placeholder="이메일"
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              <input
                className={styles.authInput}
                placeholder="비밀번호"
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
              />
              {authMode === 'signup' && (
                <input
                  className={styles.authInput}
                  placeholder="비밀번호 확인"
                  type="password"
                  value={authForm.confirmPassword}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                />
              )}
              {authError && <p className={styles.authError}>{authError}</p>}
              {authSuccess && <p className={styles.authSuccess}>{authSuccess}</p>}
              <button type="submit" className={styles.primaryBtn} disabled={isSubmittingAuth}>
                {isSubmittingAuth ? '처리 중...' : authMode === 'login' ? '로그인' : '회원가입'}
              </button>
              <button
                type="button"
                className={styles.authSwitchBtn}
                onClick={() => {
                  const nextMode = authMode === 'login' ? 'signup' : 'login'
                  setAuthMode(nextMode)
                  setAuthError('')
                  setAuthSuccess('')
                  setAuthForm({ email: authForm.email, password: '', confirmPassword: '' })
                }}
              >
                {authMode === 'login' ? '회원가입으로 전환' : '로그인으로 전환'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
