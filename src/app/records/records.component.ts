import { Component, ViewEncapsulation, OnInit , Input} from '@angular/core';
import { RestService } from '../rest.service';
import { ActivatedRoute, Router } from '@angular/router';

import {ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';


import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

import { DataService } from "../data.service";

export interface GroupData {
  id: string;
  name: string;
  data: string;


}
export interface DGPushStatus {
    dest: string;
    label: string;
    status: string;
    group: string;
    operation: string;
}

@Component({
  selector: 'app-records',
  templateUrl: './records.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./records.component.css']
})


export class RecordsComponent implements OnInit {

  @Input() recordData:any = { index: 0, name: '', data: '' };

  group:any=[];
  save_results:string="Not Saved";  

  displayedColumns: string[] = [ 'name', 'data'];
  dataSource: MatTableDataSource<GroupData>;

  statusDisplayedColumns = [ 'dest', 'status'];
  dgPushStatus :DGPushStatus[] = [] ;
  pushStatusDataSource: DGPushStatus[] ;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  

  constructor(private http: HttpClient , public rest:RestService, private route: ActivatedRoute, private router: Router, private data: DataService) { }

  results:any = {};
  deviceList:any = {};
  grpSrc:string = "";
  deviceSlct:boolean = false;
  destAddress:string = '';
  relatedDevices:any = [];
  masterAddress:string = '';
  selectionMade:boolean = false;
  deviceSelect:any = [];
  selected:any = [];
  deviceMap:any = {};
  recOperation:string = "";
  recordKey:string = "";
  recordValue:string = "";
  // device_hostnames is all the devices.
  device_hostnames:any=[];
  s1:any='';

  


  ngOnInit() {

    //load the list of devices to manage, this can be per data-group or all bigips.
    // If per group, then it is set by "devices" component from data-group record on file.
    // If all bigips then it is from devices file on record.
    this.data.currentDeviceList.subscribe(deviceList => this.deviceList = deviceList);
    this.relatedDevices = this.deviceList;
    this.data.allDeviceHostnames.subscribe(device_hostnames => this.device_hostnames = device_hostnames);

    //this.downloadAuth("dgapp1.json");    
    this.data.curDevAuth.subscribe(s1 => this.s1 = s1);

    //load the group records to display on page
    this.data.grp_results.subscribe(results => {
      this.results = results;
    })

    // load the source of the group data URL/BigIP/File etc..
    this.data.grp_source.subscribe(grpSrc => this.grpSrc = grpSrc );


    // load IP address of BigIP currently getting records from, this is the "master"
    this.data.devAddress.subscribe(destAddress => this.destAddress = destAddress );
    this.masterAddress = this.destAddress;


    if (Object.getOwnPropertyNames(this.results).length === 0 ) {
          //|| this.grpSrc == 'BigIP'
      var recs = { "records": [] } ;
    	this.getRecords();
      this.grpSrc = 'BigIP';
      this.data.setGrpSource(this.grpSrc);

    } else {
      this.data.setGrpSource(this.grpSrc);

      this.group = this.results;
      //this.group.devices=this.relatedDevices;
      this.data.setGrpData(this.results);
      this.dataSource = new MatTableDataSource(this.results.records);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }

    this.data.currentMessage.subscribe(save_results => this.save_results = save_results)

  }

  downloadAuth(url) {
 
    this.rest.getgrpFromURL('/'+url, url)
        .subscribe(res => {
          this.s1=res[0].text;
        }, (err) => {
          console.log('Unable to get auth information. ',err);
          this.s1='';
        }
      );        
  }


  getRecords() {

    this.rest.getProduct(this.route.snapshot.params['id'], this.destAddress, this.s1).subscribe((data: any) => {
      //recs=data;
      console.log('Get Records: ' );
      this.group = data;
      //this.group.source = 'BigIP';
      //this.group.devices= this.relatedDevices;
  	  this.dataSource = new MatTableDataSource(data.records);
   	  this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      //console.log('***',this.group);
    }, (err) => {
          this.save_results=err.error.message;
          console.log('Get Records: ', err.error.message);
        }
    );
  }


  recOps(index ,groupname, key, value, op) {
    // Called from table record selection.
      this.recordData.name=key;
      this.recordData.data=value;
      this.recordData.index=index;
    // enables record edit panel
      this.recOperation = op;
  }


  inMemRecOps(index ,groupname, key, value, op) {
     console.log('>>> ', index, groupname, key, value, op, this.relatedDevices);

     if (this.grpSrc == 'BigIP' ) {
       /*   if (op=='ADD') {
             this.add(groupname);
           } else if (op=='UPDATE') {
             this.onRowClicked(groupname, key, value);
           } else if (op== 'DELETE') {
              this.delete(groupname, key)
           } */
           
           //console.log('master hostname: ' , master, this.device_hostnames[this.masterAddress]);
           if (this.device_hostnames[this.masterAddress]!=undefined) {
               let dest=this.device_hostnames[this.masterAddress];
               if (op != 'save') {
                  this.recordOps(op, groupname, this.recordData, dest).subscribe((result) => {
                      this.data.changeMessage("Updated running config only.");
                      this.getRecords();
                      console.log ('Master Device update:', this.masterAddress, dest , 'Other devices: ', this.relatedDevices);
                      if (op=="REPEAT") {
                          this.recordData.name =  "";
                          this.recOperation='ADD';
                        //this.router.navigate(['/record-details/', 'ADD', this.group , '', '']);
                      } else {
                        //this.router.navigate(['/records/'+this.group]);
                          this.recOperation="";
                      }
                  }, (err) => {
                      this.dgPushStatus.push({ dest: dest, label: this.masterAddress , group: groupname, status: err, operation: op});
                      console.log(err);
                      this.data.changeMessage(err);
                  });
              } else {
                  this.recordOps('save',groupname, this.recordData, dest).subscribe((result) => {
                      this.data.changeMessage("Saved to Permanent Config");
                      console.log ('Master Device update:', this.masterAddress, dest);
                  }, (err) => {
                      console.log(err);
                      this.dgPushStatus.push({ dest: dest, label: this.masterAddress, group: "", status: err, operation: op});
                      this.data.changeMessage(err);
                  });
              }      

              for (var x in this.relatedDevices) {
                    let dest=this.device_hostnames[this.relatedDevices[x]];
                    console.log('Related device:',dest);
                    if (dest!=undefined) {
                        this.recordOps(op, groupname, this.recordData, dest).subscribe((result) => {
                          console.log ('Related Device updated:', dest);
                        }, (err) => {
                          console.log(err);
                          this.dgPushStatus.push({ dest: dest, label: this.relatedDevices[x] , group: groupname, status: err, operation: op});
                          this.data.changeMessage(err);
                        });
                    }
              }
          } else {
            this.dgPushStatus.push({ dest: this.masterAddress, label: this.masterAddress, group: "", status: "Could not find destination hostname", operation: op});
            this.data.changeMessage('No hostname for '+ this.masterAddress);
          }

      } else {

          if (op=='ADD' || op=='REPEAT') {
              this.group.records.push({"name":key, "data":value})
              console.log(this.group);
              if (op=='REPEAT') {
                this.recordData.name='';
                this.recordData.data='';
                this.recOperation=op;
              }
          } else if (op=='UPDATE') {
              this.group.records[index].data=value;
              console.log('Added record:', this.group[index]);
          } else if (op== 'DELETE') {
              this.group.records.splice(index, index);
              console.log('Deleted Record:', this.group[index]);
          }
      }
      this.dataSource = new MatTableDataSource(this.group.records);
  }

  /* 
  recordUpdate(index ,groupname, key, value, op, dest ) {

    this.recordOps(op, groupname, this.recordData, this.masterAddress).subscribe((result) => {
      //this.op_result = this.operation + ' OK';
      this.data.changeMessage("Updated running config only.");
      this.getRecords();

      if (op=="REPEAT") {
        this.recordData.name =  "";
        this.recOperation='ADD';
        //this.router.navigate(['/record-details/', 'ADD', this.group , '', '']);
      } else {
        //this.router.navigate(['/records/'+this.group]);
        this.recOperation="";
      }

    }, (err) => {
      console.log(err);
      this.data.changeMessage(err);
    });

  }
  */


  recordOps (operation, groupname, record , dest ): Observable<any> {
    let oper='';
    if (operation=='ADD' || operation=='REPEAT') {
        oper='add';
    } else if ( operation=='UPDATE') {
        oper='edit';
    } else { 
        oper=operation.toLowerCase();
    }

    let rec:any={};
    if (operation=='save' || operation=='SAVE') {
        rec = { "command":"run" , "name":"/Common/add-rec", "utilCmdArgs": "save" };
    } else {
        record.data=record.data.replace(/'/g,"`");
        //console.log('data:', record.data);
        let record_data = (oper == 'delete' || record.data=='') ? "\}\"" :  "{ data \'"+ record.data +"\'\}\}\""

        rec = { "command":"run" , "name":"/Common/add-rec", "utilCmdArgs": oper +"-record " + groupname + " \"\{ "+ record.name + record_data };
    }
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
    //    'Authorization': 'Basic '+this.s1,
        'target': dest
      })
    };
    
    let endpoint="/mgmt/tm/cli/script";

    return this.http.post(endpoint , JSON.stringify(rec) , httpOptions).pipe(
      tap(_ => {
        //console.log(operation+" record id=${record.name}");

      }),
      catchError(this.handleError<any>('Failed: ' + rec, groupname, dest))
    );
  }



  add(groupname) {
      //this.router.navigate(['/record-details/', 'ADD', groupname , '', '']);
      //this.Operation='ADD'
  }

  onRowClicked(groupname , recname, recvalue) {
    this.router.navigate(['/record-details/', 'UPDATE', groupname,  recname, recvalue]);
  }

  delete(group, name) {
    this.rest.deleteRecord(group, name, ' ', this.s1)
      .subscribe(res => {
          this.getRecords();
          this.save_results="Written to running config only.";
        }, (err) => {
          console.log(err);
        }
      );
  }

  gotoDGList() {
    if (this.grpSrc == 'BigIP' && this.save_results != 'Saved to Permanent Config') {
      this.inMemRecOps(0 ,'','','','save');
    }
    this.router.navigate(['/devices']);
  }

 /* 
    pushToOtherBigIPs , prepares the selection list.
      - when editing an existing dat-grou, the selection list is only the subordinates.
      - when importing a new data-group, the selection list is all Big-IPs.
    getSelectedDevices, toggles GO button
    startPush, intiates the transfer.

  */
 
  pushToOtherBigIPs() {
    console.log('lists:', this.deviceList, this.device_hostnames);
      var dev:any = {};
      this.deviceSelect = [];
      this.deviceMap = {};
      this.deviceSlct=true;


      if (this.grpSrc == 'BigIP' && this.save_results != 'Saved to Permanent Config') {
        this.inMemRecOps(0 ,'','','','save');
        this.deviceSelect = this.deviceList;

      } else {
        this.deviceList=this.device_hostnames;
      


          for (var x in Object.keys(this.deviceList)) {
            dev=Object.keys(this.deviceList)[x];
            //console.log('==', dev, x , Object.keys(this.deviceList)[x]);
            //if (dev.type=='bigip') {
               this.deviceSelect.push( dev );
               //this.deviceMap[dev.address] = dev.name;
            //}
          }
      }
  }

  getSelectedDevices(event: any) {
    this.selected = event.value;

    console.log('Selected value -> ', this.selected);

    if (event.value.length == 0 ) {
      this.selectionMade=false; 
     } else {
      this.selectionMade=true;
     }
  }

  startPush() {

    this.dgPushStatus = [];
    for (var dev in  this.selected) {
        //this.rest.addGroup(this.group);
        let dest=this.device_hostnames[this.selected[dev]];
        //console.log('Start Push', this.selected[dev], dest);
        if (dest!=undefined) {
            this.addGroup(this.group, dest).subscribe((result) => {
                  console.log('returned Group .');
                }, (err) => {
                  console.log(err);
                });

        } else {
            this.dgPushStatus.push({ dest: this.selected[dev], label: this.selected[dev], group: '', status: 'Hostname not found', operation: 'add group'});
        }
      }
  }
  


  addGroup (group, dest): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Authorization': 'Basic '+this.s1,
        'target': dest,
      })
    };
    let grp:any={};
    grp.name=group.name;
    grp.type=group.type;
    grp.partition=group.partition;
    //grp.description=group.description;
    grp.records=group.records;

    let datagroup = JSON.stringify(grp);
    //console.log('** Grp:', dest, datagroup);
    //datagroup = {"name": group.name, "partition": "Common", "type": group.type };

    return this.http.post<any>( '/mgmt/tm/ltm/data-group/internal/', datagroup, httpOptions).pipe(
      tap((group) => {
        this.dgPushStatus.push({ dest: dest, label: this.deviceMap[dest], group: group, status: 'OK', operation: 'Push to Big-IPs'});
        this.pushStatusDataSource = [...this.dgPushStatus];
        console.log("added group w/ id=", group.name , 'to:', dest, 'Array length:', this.pushStatusDataSource.length, this.pushStatusDataSource[this.pushStatusDataSource.length - 1 ]) ;
      }),
      catchError(this.handleError<any>('Push to Big-IPs', group.name, dest))
    );
  }


  handleError<T> (operation = 'operation', group, dest, result?: T) {
    return (error: any): Observable<T> => {

      // TODO: send the error to remote logging infrastructure
      //console.error(error.error.message); // log to console instead
      console.error(error);
      // TODO: better job of transforming error for user consumption
      //console.log(dest, `${operation} failed: ${error.message}`);

      this.dgPushStatus.push({ dest: dest, label: this.deviceMap[dest], group: group, status: error.error.message, operation: operation});
      this.pushStatusDataSource = [...this.dgPushStatus];
      console.log ('Push Status:', this.pushStatusDataSource);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  /*  */

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

}