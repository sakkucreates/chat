import { createMessage, getConversationMessages, getDb } from '../src/lib/db';

async function testConcurrency() {
  console.log('--- STARTING CONCURRENCY & PERSISTENCE VERIFICATION TEST ---');
  
  const user1 = 'test_sakshi';
  const user2 = 'test_user1';

  // 1. Simulate Sakshi and USER1 sending messages simultaneously (at the exact same millisecond)
  console.log('Sending simultaneous messages from Sakshi and USER1...');
  
  const p1 = createMessage({
    senderId: user1,
    receiverId: user2,
    text: 'Hello USER1 from Sakshi (Concurrent Test)'
  });

  const p2 = createMessage({
    senderId: user2,
    receiverId: user1,
    text: 'Hi Sakshi from USER1 (Concurrent Test)'
  });

  const [msg1, msg2] = await Promise.all([p1, p2]);

  console.log('Message 1 Created:', msg1.id, msg1.text);
  console.log('Message 2 Created:', msg2.id, msg2.text);

  // 2. Fetch conversation messages
  const conversation = await getConversationMessages(user1, user2);
  console.log(`Fetched ${conversation.length} conversation messages.`);

  const containsMsg1 = conversation.some(m => m.id === msg1.id);
  const containsMsg2 = conversation.some(m => m.id === msg2.id);

  console.log('Sakshi message present:', containsMsg1);
  console.log('USER1 message present:', containsMsg2);

  if (containsMsg1 && containsMsg2) {
    console.log('✅ TEST SUCCESSFUL: Both concurrent messages were stored atomically without race conditions or overwrites!');
  } else {
    console.error('❌ TEST FAILED: One or more messages were lost due to race condition!');
    process.exit(1);
  }
}

testConcurrency().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
