async function run() {
  try {
    const res = await fetch('https://my-digichecklist-default-rtdb.firebaseio.com/employees.json');
    const data = await res.json();
    const employees = Object.values(data).filter(Boolean);
    
    console.log('Total employees:', employees.length);
    
    // Let's see how many contain 'am' (case insensitive)
    const matchAm = employees.filter(e => 
      e.Employee_Name?.toLowerCase().includes('am') || 
      e.Employee_ID?.toLowerCase().includes('am')
    );
    console.log('Employees matching "am":', matchAm.map(e => `${e.Employee_Name} (${e.Employee_ID})`));

    // Let's see how many contain 'manpreet sin'
    const matchManpreet = employees.filter(e => 
      e.Employee_Name?.toLowerCase().includes('manpreet sin') || 
      e.Employee_ID?.toLowerCase().includes('manpreet sin')
    );
    console.log('Employees matching "manpreet sin":', matchManpreet.map(e => `${e.Employee_Name} (${e.Employee_ID})`));

  } catch (err) {
    console.error(err);
  }
}
run();
