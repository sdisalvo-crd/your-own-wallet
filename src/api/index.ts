import axios from "axios";
export const fetchBlockfrost = async (endpoint: string) => {

  const config = {
    method: 'GET',
    url: endpoint,
    headers: {
      "project_id": 'preprodxEh6wjDX97dUuMbn1KiHSXvq43X58HoD'
    }
  };
  
  return axios(config)
    // If all went well we should be able to fetch some useful info
    .then(response => {
      return response.data;
    })
    // Otherwise we will see an error. This may usually happen when a new 
    // wallet is created and funds were never transferred to it.
    .catch((error) => {
      if (error.response && error.response.status === 404){
        console.log('New wallet detected.');
      }
    });
}
