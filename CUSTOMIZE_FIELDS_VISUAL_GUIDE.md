# 🎨 CUSTOMIZE FIELDS - VISUAL GUIDE & USER MANUAL

## 👁️ Visual Layout

### Before Implementation:
```
┌──────────────────────────────────────────────────────────────┐
│ 📋 Customer Entry                                            │
├──────────────────────────────────────────────────────────────┤
│ Form with all fields visible (cluttered)                     │
│ Users see fields they don't need                             │
│ Hard to find relevant fields quickly                         │
└──────────────────────────────────────────────────────────────┘
```

### After Implementation:
```
┌──────────────────────────────────────────────────────────┐
│ 📋 Customer Entry          [🎚️ Customize Fields]        │
├──────────────────────────────────────────────────────────┤
│ Only relevant fields visible (clean, organized)           │
│ Users see only what they need                             │
│ Easy navigation, faster data entry                        │
└──────────────────────────────────────────────────────────┘
```

---

## 🖱️ Step-by-Step User Guide

### STEP 1: Locate the Button
```
Looking at the customer entry form header:

┌──────────────────────────────────────┐
│ 📋 Customer Entry                    │  ← Form Title on LEFT
│                    🎚️ Customize Fields│  ← Button on RIGHT
└──────────────────────────────────────┘

The button is in the TOP RIGHT corner
Icon: Equipment/Sliders (🎚️)
Color: Secondary (gray/light)
```

### STEP 2: Click the Button
```
Action: Left-click the "Customize Fields" button

Result: A modal dialog appears with all available fields
```

### STEP 3: See the Modal
```
┌──────────────────────────────────────────────────┐
│  🎚️ Customize Fields                      [✕]    │
├──────────────────────────────────────────────────┤
│                                                  │
│  ☑ Company              ☐ Shopkeeper Name       │
│  ☑ Customer Code        ☐ Address               │
│  ☑ Customer Type        ☐ Primary Phone         │
│  ☑ Customer Name        ☐ Secondary Phone       │
│  ☐ Email Address        ☐ Identity Card         │
│  ☐ Sales Officer        ☐ Supplier Man          │
│  ☐ Country              ☐ Region                │
│  ☐ City                 ☐ City Zone              │
│  ☐ Area                 ☐ Tax Registration      │
│  ☐ STRN                 ☐ Filer Status          │
│  ☐ NTN                  ☐ Advance Tax %         │
│  ☐ Default Discount     ☐ Credit Limit          │
│  ☐ Credit Period        ☐ Opening Debit         │
│  ☐ Opening Credit       ☐ Wholesaler            │
│  ☐ Blacklist                                    │
│                                                  │
├──────────────────────────────────────────────────┤
│  [Reset to Default]      [Save Preferences]     │
└──────────────────────────────────────────────────┘

✓ = Field is visible in form
✗ = Field is hidden in form
```

### STEP 4: Customize Fields
```
EXAMPLE: You only need basic customer info

Default state:
  ☑ Company              ☐ Shopkeeper Name
  ☑ Customer Code        ☐ Address
  ☑ Customer Type        ☐ Primary Phone
  ☑ Customer Name        ☐ Secondary Phone

Your customization:
  ☑ Company              ☐ Shopkeeper Name
  ☑ Customer Code        ☐ Address
  ☑ Customer Type        ☐ Primary Phone
  ☑ Customer Name        ☑ Email Address       ← Added this
  ☑ Sales Officer        ☐ Secondary Phone   ← Added this
```

### STEP 5: Save Preferences
```
ACTION: Click "Save Preferences" Button

┌────────────────────────────────────────────┐
│  [Blue Button: Save Preferences]           │
└────────────────────────────────────────────┘

RESULT:
  1. Modal closes
  2. Form updates immediately
  3. Only selected fields are now visible
  4. Settings saved to browser
  5. Success notification appears

Toast Notification:
┌───────────────────────────┐
│ ✓ Field preferences saved │
│   successfully!           │
└───────────────────────────┘
```

### STEP 6: Custom Form Now Shows
```
Before customization:
┌─────────────────────────────────────────────────────────┐
│ 📋 Customer Entry                                       │
├─────────────────────────────────────────────────────────┤
│ Company:           [Dropdown]                           │
│ Customer Code:     Auto Generated                       │
│ Customer Type:     [Dropdown]                           │
│ Customer Name:     [Input Field]                        │
│ ... 25 more fields (hidden by default)                 │
└─────────────────────────────────────────────────────────┘

After customization:
┌─────────────────────────────────────────────────────────┐
│ 📋 Customer Entry                                       │
├─────────────────────────────────────────────────────────┤
│ Company:           [Dropdown]                           │
│ Customer Code:     Auto Generated                       │
│ Customer Type:     [Dropdown]                           │
│ Customer Name:     [Input Field]                        │
│ Email Address:     [Input Field]            ← Added    │
│ Sales Officer:     [Dropdown]               ← Added    │
│ ... other selected fields                              │
└─────────────────────────────────────────────────────────┘

Form is now clean and focused!
```

---

## 🔄 Reset to Defaults

### When to Use:
- You accidentally hid too many fields
- You want to start over
- You made a mistake
- You want to see all available fields

### How to Reset:
```
1. Click "Customize Fields" button
2. Click "Reset to Default" button
3. Confirm in the popup dialog
4. Wait for notification
5. Modal closes
6. All default fields visible again

┌──────────────────────────────────┐
│ Reset to default?                │
│                                  │
│ Are you sure? This will restore  │
│ all fields to original visibility│
│                                  │
│ [Cancel]    [Yes, Reset]         │
└──────────────────────────────────┘
```

---

## 💾 How Data is Saved

### Storage Explanation:
```
Your Browser
    ↓
localStorage (Local Storage)
    ↓
Key: "customerFormCustomizeFields"
Value: {JSON data of your preferences}
    ↓
Not Sent to Server
Not Synced to Cloud
Not Shared with Others
Just Saved in Your Browser
```

### What Gets Saved:
```
Field ID          → Visibility Status
=============================================
company           → true (visible)
customerCode      → true (visible)
customerName      → true (visible)
address           → false (hidden)
primaryPhone      → true (visible)
email             → false (hidden)
... etc for all 29 fields
```

---

## 🌙 Dark Mode Support

### Light Mode:
```
┌──────────────────────────────────────────────────┐
│  🎚️ Customize Fields                      [✕]    │ ← Dark text on light background
├──────────────────────────────────────────────────┤
│  ☑ Company              (Light gray checkbox)    │
│  ☐ Address              (Light gray checkbox)    │
│  [Light blue button]    [Dark blue button]       │
└──────────────────────────────────────────────────┘
```

### Dark Mode:
```
┌──────────────────────────────────────────────────┐
│  🎚️ Customize Fields                      [✕]    │ ← Light text on dark background
├──────────────────────────────────────────────────┤
│  ☑ Company              (Light gray checkbox)    │
│  ☐ Address              (Light gray checkbox)    │
│  [Dark button]          [Gold/Yellow button]     │
└──────────────────────────────────────────────────┘
```

**Both modes work perfectly!**

---

## 📱 Mobile / Responsive Design

### Desktop View (2 columns):
```
┌──────────────────────────────────────────────┐
│  ☑ Company         ☐ Address                │
│  ☑ Customer Code   ☐ Primary Phone          │
│  ☑ Customer Type   ☐ Secondary Phone        │
│  ☑ Customer Name   ☐ Email Address          │
└──────────────────────────────────────────────┘
```

### Tablet View (2 columns, narrower):
```
┌────────────────────────────────────┐
│  ☑ Company    ☐ Address            │
│  ☑ Cust Code  ☐ Primary Phone      │
│  ☑ Cust Type  ☐ Secondary Phone    │
│  ☑ Cust Name  ☐ Email Address      │
└────────────────────────────────────┘
```

### Mobile View (1 column, scrollable):
```
┌──────────────────┐
│  ☑ Company       │
│  ☑ Cust Code     │
│  ☑ Cust Type     │
│  ☑ Cust Name     │
│  ☐ Shopkeeper... │
│  ☐ Address       │
│  ☐ Primary Phone │
│  ☐ Secondary Ph..│
│  Scroll down...  │
└──────────────────┘
```

**Works perfectly on all devices!**

---

## ⌨️ Keyboard Accessibility

### Using Tab Key:
```
1. Tab to "Customize Fields" button
2. Press Enter to open modal
3. Tab through checkboxes
4. Space to toggle checkbox
5. Tab to "Save Preferences" button
6. Press Enter to save
7. Press Escape to close modal
```

### Using Screen Readers:
```
Button: "Customize Fields button"
Modal: "Customize Fields dialog"
Checkbox: "Company, checkbox, checked"
Unchecked: "Address, checkbox, not checked"
Button: "Save Preferences button"
Button: "Reset to Default button"
```

**Full accessibility support!**

---

## 🔧 Common Scenarios

### Scenario 1: Sales Team
**Goal:** Only see customer contact and sales info
**Configuration:**
```
✓ Company
✓ Customer Code
✓ Customer Type
✓ Customer Name
✓ Primary Phone
✓ Secondary Phone
✓ Email Address
✓ Sales Officer
✗ Everything else
```

### Scenario 2: Accounting Department
**Goal:** See all tax and financial information
**Configuration:**
```
✓ Company
✓ Customer Code
✓ Customer Name
✓ Is Sales Tax Registered?
✓ STRN
✓ Is Filer?
✓ NTN
✓ Advance Income Tax %
✓ Default Discount %
✓ Credit Limit
✓ Credit Period Limit
✓ Opening Debit
✓ Opening Credit
```

### Scenario 3: Territory Manager
**Goal:** Focus on location and sales territory
**Configuration:**
```
✓ Company
✓ Customer Code
✓ Customer Name
✓ Address
✓ Country
✓ Region
✓ City
✓ City Zone
✓ Area
✓ Sales Officer
```

---

## ❌ Troubleshooting Guide

### Problem: Settings not saving
```
Solution 1: Clear browser cache and reload page
Solution 2: Check if localStorage is enabled in browser
Solution 3: Try "Reset to Default" button
Solution 4: Try a different browser
```

### Problem: Fields won't hide
```
Solution 1: Hard refresh (Ctrl+Shift+R)
Solution 2: Close modal and reopen
Solution 3: Click "Reset to Default"
Solution 4: Close browser and reopen
```

### Problem: Modal won't open
```
Solution 1: Clear browser cache
Solution 2: Disable browser extensions
Solution 3: Try incognito/private mode
Solution 4: Try a different browser
```

### Problem: Lost preferences after restart
```
This is normal if:
- You cleared browser cache
- You cleared browsing data
- Cookies/storage is set to auto-delete
- You're in private/incognito mode

Solution: Customize again
Note: Settings are stored locally in your browser
```

---

## ✨ Tips & Tricks

### Tip 1: Save Time
```
Customize once, use forever
Your settings are saved automatically
No need to customize again
```

### Tip 2: Focus Your Form
```
Hide fields you don't use
Makes form cleaner
Faster data entry
Fewer distractions
```

### Tip 3: Different Roles
```
Each person can have different settings
Sales team ≠ Accounting team
Different browsers = Different settings
Customize for your job
```

### Tip 4: Experimentation
```
Try different combinations
Reset whenever you want
No permanent changes
Safe to experiment
```

### Tip 5: Mobile Users
```
Lighter form on mobile
Scroll less
Touch-friendly interface
Same great functionality
```

---

## 📊 Before & After Comparison

### Before Implementation:
```
❌ All fields visible (overwhelming)
❌ Hard to find what you need
❌ Scrolling through unnecessary fields
❌ Same form for everyone
❌ No customization options
❌ Cluttered interface
```

### After Implementation:
```
✅ Only needed fields visible
✅ Quick to find relevant fields
✅ Minimal scrolling required
✅ Different setups for different roles
✅ Full customization control
✅ Clean, organized interface
```

---

## 🎓 Feature Overview

| Feature | Details |
|---------|---------|
| **Button Location** | Top-right corner of form |
| **Modal Type** | Customizable field selector |
| **Fields** | 29 customizable fields |
| **Storage** | Browser localStorage |
| **Persistence** | Across sessions |
| **Reset** | One-click to defaults |
| **Notifications** | Visual feedback |
| **Mobile** | Fully responsive |
| **Dark Mode** | Fully supported |
| **Accessibility** | Keyboard & screen reader support |

---

## 🚀 Getting Started (5 Minutes)

1. **Open Customer Entry Form** (2 seconds)
2. **Click Customize Fields Button** (1 second)
3. **Select Your Fields** (2 minutes)
4. **Click Save** (1 second)
5. **Done! Enjoy your customized form!** (0 seconds)

**Total Time: ~3-5 minutes to set up**  
**Time Saved: Hours over coming months!**

---

## 💬 Feedback & Questions

**If something doesn't work:**
1. Check this guide first
2. Try "Reset to Default"
3. Clear browser cache
4. Contact your system administrator

**Feature Suggestions:**
- Email: support@ledgerone.local
- Include: Browser type, steps to reproduce

---

**🎉 Enjoy your customized Customer Entry Form!**

*Customize | Save | Enjoy | Repeat*

---

**Last Updated:** April 14, 2026  
**Version:** 1.0 (Initial Release)  
**Status:** ✅ Production Ready
