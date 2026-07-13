# Admin to Member Switch - How It Works

This document explains how the "Admin to Member Switch" feature works under the hood. It relies on a React concept called **"State Management"** and **"Conditional Navigation"**.

There are exactly 3 files involved in making this work:

### 1. `AuthContext.tsx` (The Brains)
We added a new state variable inside your AuthContext called `viewMode`.
```typescript
const [viewMode, setViewMode] = useState<'admin' | 'member'>('admin');
```
This acts as a global "switch". Because it lives in the `AuthContext`, every single screen in your app can check what the current mode is, and can also change it using `setViewMode`.

### 2. `RootNavigator.tsx` (The Traffic Cop)
The RootNavigator acts as the traffic cop deciding which screens the user should see.
Before, it only checked: *"Is this person an Admin in Salesforce?"* If yes, they saw the Admin screens. If no, they saw the Member screens.

We changed the logic so it now checks **two** things:
1. Is the person an Admin?
2. What is their current `viewMode`?

```typescript
const isAdmin = member?.userType?.toLowerCase() === 'admin';
const showAdminView = isAdmin && viewMode === 'admin';
```
If `showAdminView` is true, React loads `AdminNavigator` (the admin dashboard).
If it's false (because the admin pressed the switch button changing the state to 'member'), React immediately unloads the Admin screens and loads the Member `TabNavigator` instead!

### 3. The Two Buttons (The Triggers)
To actually flip the switch, we placed two buttons in the UI:

**Switch to Member (Inside `AdminNavigator.tsx`)**:
When you open the hamburger drawer and tap "Member View", it simply runs this function:
```typescript
onPress={() => setViewMode('member')}
```
This tells `AuthContext` to change the state. `RootNavigator` immediately notices the change and swaps the screen to the Member layout.

**Switch to Admin (Inside `RootNavigator.tsx`)**:
When the Admin is viewing the Member side, we render a floating button over the tab bar. We wrapped it in a security check so normal members never see it:
```typescript
{isActualAdmin && viewMode === 'member' && (
  <TouchableOpacity onPress={() => setViewMode('admin')}>
     <Text>Admin View</Text>
  </TouchableOpacity>
)}
```
When tapped, it flips the `viewMode` back to `'admin'`, and the `RootNavigator` instantly puts you back into the Admin Dashboard.

### Summary
It works instantly because the user never actually logs out. We simply use a global variable (`viewMode`) to trick the app into rendering the Member screens for an Admin user until they flip the variable back!
