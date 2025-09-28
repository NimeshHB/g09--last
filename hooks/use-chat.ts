import { useState, useEffect, useCallback } from 'react'

interface ChatMessage {
  _id?: string
  conversationId: string
  senderId: string
  senderName: string
  senderType: 'admin' | 'user'
  message: string
  timestamp: Date
  read: boolean
}

interface Conversation {
  _id?: string
  userId: string
  userName: string
  adminId?: string
  adminName?: string
  status: 'active' | 'closed'
  lastMessage?: string
  lastMessageTime?: Date
  createdAt: Date
  updatedAt: Date
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock data for demonstration
  const mockConversations: Conversation[] = [
    {
      _id: '1',
      userId: 'user1',
      userName: 'John Doe',
      status: 'active',
      lastMessage: 'Hello admin, I need help with my booking',
      lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      _id: '2',
      userId: 'user2',
      userName: 'Sarah Smith',
      status: 'active',
      lastMessage: 'My parking slot is showing as occupied but I haven\'t parked yet',
      lastMessageTime: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000)
    },
    {
      _id: '3',
      userId: 'user3',
      userName: 'Mike Johnson',
      status: 'active',
      lastMessage: 'Can you extend my parking time?',
      lastMessageTime: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 25 * 60 * 1000)
    },
    {
      _id: '4',
      userId: 'user4',
      userName: 'Emma Wilson',
      status: 'active',
      lastMessage: 'Payment issue with my booking',
      lastMessageTime: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
      updatedAt: new Date(Date.now() - 35 * 60 * 1000)
    }
  ]

  const mockMessages: Record<string, ChatMessage[]> = {
    '1': [
      {
        _id: 'm1',
        conversationId: '1',
        senderId: 'user1',
        senderName: 'John Doe',
        senderType: 'user',
        message: 'Hello admin, I need help with my booking',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: true
      },
      {
        _id: 'm2',
        conversationId: '1',
        senderId: 'admin1',
        senderName: 'Admin',
        senderType: 'admin',
        message: 'Hi John! I\'d be happy to help. What seems to be the issue?',
        timestamp: new Date(Date.now() - 28 * 60 * 1000),
        read: true
      },
      {
        _id: 'm3',
        conversationId: '1',
        senderId: 'user1',
        senderName: 'John Doe',
        senderType: 'user',
        message: 'I booked slot A-12 but the gate won\'t open with my QR code',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        read: true
      },
      {
        _id: 'm4',
        conversationId: '1',
        senderId: 'admin1',
        senderName: 'Admin',
        senderType: 'admin',
        message: 'Let me check that for you. Can you try regenerating the QR code from your booking?',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        read: true
      }
    ],
    '2': [
      {
        _id: 'm5',
        conversationId: '2',
        senderId: 'user2',
        senderName: 'Sarah Smith',
        senderType: 'user',
        message: 'My parking slot is showing as occupied but I haven\'t parked yet',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        read: false
      }
    ],
    '3': [
      {
        _id: 'm6',
        conversationId: '3',
        senderId: 'user3',
        senderName: 'Mike Johnson',
        senderType: 'user',
        message: 'Can you extend my parking time?',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        read: false
      }
    ],
    '4': [
      {
        _id: 'm7',
        conversationId: '4',
        senderId: 'user4',
        senderName: 'Emma Wilson',
        senderType: 'user',
        message: 'Payment issue with my booking',
        timestamp: new Date(Date.now() - 35 * 60 * 1000),
        read: false
      }
    ]
  }

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      
      // In a real implementation, this would be:
      // const response = await fetch('/api/chat')
      // const data = await response.json()
      // setConversations(data.conversations)
      
      // For now, use mock data
      setConversations(mockConversations)
      setError(null)
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError('Failed to load conversations')
      setConversations(mockConversations) // Fallback to mock data
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true)
      
      // In a real implementation, this would be:
      // const response = await fetch(`/api/chat?conversationId=${conversationId}`)
      // const data = await response.json()
      // setMessages(data.messages)
      
      // For now, use mock data
      setMessages(mockMessages[conversationId] || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
      setMessages(mockMessages[conversationId] || []) // Fallback to mock data
    } finally {
      setLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (conversationId: string, message: string) => {
    try {
      // In a real implementation, this would be:
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     conversationId,
      //     senderId: 'admin1',
      //     senderName: 'Admin',
      //     senderType: 'admin',
      //     message
      //   })
      // })
      // const data = await response.json()
      
      // For now, add to mock data
      const newMessage: ChatMessage = {
        _id: `m${Date.now()}`,
        conversationId,
        senderId: 'admin1',
        senderName: 'Admin',
        senderType: 'admin',
        message,
        timestamp: new Date(),
        read: false
      }
      
      setMessages(prev => [...prev, newMessage])
      
      // Update conversation's last message
      setConversations(prev => prev.map(conv => 
        conv._id === conversationId 
          ? { ...conv, lastMessage: message, lastMessageTime: new Date() }
          : conv
      ))
      
      setError(null)
      return true
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
      return false
    }
  }, [])

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      // In a real implementation, this would be:
      // await fetch('/api/chat', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ conversationId, action: 'markAsRead' })
      // })
      
      // For now, update mock data
      setMessages(prev => prev.map(msg => 
        msg.conversationId === conversationId 
          ? { ...msg, read: true }
          : msg
      ))
      
      setError(null)
    } catch (err) {
      console.error('Error marking as read:', err)
      setError('Failed to mark as read')
    }
  }, [])

  const closeConversation = useCallback(async (conversationId: string) => {
    try {
      // In a real implementation, this would be:
      // await fetch('/api/chat', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ conversationId, action: 'closeConversation' })
      // })
      
      // For now, update mock data
      setConversations(prev => prev.map(conv => 
        conv._id === conversationId 
          ? { ...conv, status: 'closed' }
          : conv
      ))
      
      setError(null)
    } catch (err) {
      console.error('Error closing conversation:', err)
      setError('Failed to close conversation')
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
      markAsRead(selectedConversation)
    }
  }, [selectedConversation, fetchMessages, markAsRead])

  return {
    conversations,
    messages,
    selectedConversation,
    setSelectedConversation,
    loading,
    error,
    sendMessage,
    markAsRead,
    closeConversation,
    refetchConversations: fetchConversations
  }
}
