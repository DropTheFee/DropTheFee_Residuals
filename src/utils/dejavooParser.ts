The Dejavoo expense upload is still failing with a 400 error from Supabase. The exact problem is in the insert payload — the matched field is being sent as the integer 1 instead of the boolean true.
Find the expense insert code and change it so that:

matched: 1 becomes matched: true
matched: 0 becomes matched: false

The merchant_expenses table expects a proper PostgreSQL boolean, not an integer. Show me the exact lines of code you are changing before and after so I can verify the fix.